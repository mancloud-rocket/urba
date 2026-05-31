import { log, truncate, maskPhone } from "./logger.js";
import { markBotMessageSent, markBotReplyFingerprint, extractSentMessageIds } from "./whatsapp-sent-cache.js";

const WA_MAX_LEN = 4096;

function evolutionConfig() {
  const baseUrl = (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY || "";
  const instance = process.env.EVOLUTION_INSTANCE || "";
  return { baseUrl, apiKey, instance };
}

function splitMessage(text) {
  const raw = String(text || "").trim() || "OK";
  if (raw.length <= WA_MAX_LEN) return [raw];

  const parts = [];
  let rest = raw;
  while (rest.length > WA_MAX_LEN) {
    parts.push(rest.slice(0, WA_MAX_LEN));
    rest = rest.slice(WA_MAX_LEN);
  }
  if (rest) parts.push(rest);
  return parts;
}

export async function sendWhatsApp(to, text, meta = {}) {
  const { baseUrl, apiKey, instance } = evolutionConfig();
  const dest = String(to).replace(/\D/g, "");

  if (!baseUrl || !apiKey || !instance) {
    log.warn("whatsapp", "send.demo_mode", {
      to: maskPhone(dest),
      preview: truncate(text, 150),
      ...meta,
    });
    return { ok: true, demo: true };
  }

  const chunks = splitMessage(text);
  log.info("whatsapp", "send.start", {
    to: maskPhone(dest),
    to_raw: dest,
    chunks: chunks.length,
    total_length: text?.length ?? 0,
    instance,
    ...meta,
  });

  let last = null;
  for (let i = 0; i < chunks.length; i++) {
    last = await sendChunk(dest, chunks[i], baseUrl, apiKey, instance, i + 1, chunks.length, meta);
    if (!last.ok) return last;
  }

  const fullText = chunks.join("");
  for (const id of extractSentMessageIds(last?.data)) {
    markBotMessageSent(id);
  }
  markBotReplyFingerprint(dest, fullText);

  log.info("whatsapp", "send.ok", {
    to: maskPhone(dest),
    chunks: chunks.length,
    wa_message_id: extractSentMessageIds(last?.data)[0] || null,
    ...meta,
  });

  return last || { ok: true };
}

async function sendChunk(to, body, baseUrl, apiKey, instance, chunkIndex, chunkTotal, meta) {
  const started = Date.now();
  let res;
  let data = {};

  try {
    res = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ number: to, text: body }),
    });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    log.error("whatsapp", "send.network_error", {
      to: maskPhone(to),
      chunk: `${chunkIndex}/${chunkTotal}`,
      error: e.message,
      duration_ms: Date.now() - started,
      ...meta,
    });
    return { ok: false, status: 0, error: { message: e.message } };
  }

  if (!res.ok) {
    log.error("whatsapp", "send.api_error", {
      to: maskPhone(to),
      chunk: `${chunkIndex}/${chunkTotal}`,
      http_status: res.status,
      error: data,
      preview: truncate(body, 100),
      duration_ms: Date.now() - started,
      ...meta,
    });
    return { ok: false, status: res.status, error: data };
  }

  return { ok: true, data };
}

export async function verifyWhatsAppCredentials() {
  const { baseUrl, apiKey, instance } = evolutionConfig();

  if (!baseUrl || !apiKey || !instance) {
    return { ok: false, reason: "missing_env" };
  }

  try {
    const res = await fetch(
      `${baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`,
      { headers: { apikey: apiKey } }
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        http_status: res.status,
        instance,
        error: data?.message || data?.error || "Evolution API error",
      };
    }

    const state = data?.instance?.state || data?.state;
    return {
      ok: state === "open",
      instance,
      state: state || "unknown",
      connection: data,
    };
  } catch (e) {
    return { ok: false, reason: "network", error: e.message };
  }
}

export function jidToPhone(jid) {
  if (!jid) return "";
  const local = String(jid).split("@")[0];
  return local.replace(/\D/g, "");
}

export function extractInboundText(message = {}) {
  if (message.conversation) return String(message.conversation).trim();
  if (message.extendedTextMessage?.text) return String(message.extendedTextMessage.text).trim();
  if (message.imageMessage?.caption) return String(message.imageMessage.caption).trim();
  if (message.videoMessage?.caption) return String(message.videoMessage.caption).trim();
  return null;
}

export function inboundTypeLabel(message = {}) {
  if (message.conversation || message.extendedTextMessage) return "texto";
  if (message.audioMessage) return "audio";
  if (message.imageMessage) return "imagen";
  if (message.videoMessage) return "video";
  if (message.documentMessage) return "documento";
  if (message.stickerMessage) return "sticker";
  if (message.locationMessage) return "ubicacion";
  return "desconocido";
}

export function summarizeWebhookPayload(body) {
  const data = body?.data;
  const key = data?.key;
  const msg = data?.message;

  return {
    event: body?.event,
    instance: body?.instance,
    from_me: key?.fromMe,
    remote_jid: key?.remoteJid,
    message_id: key?.id,
    push_name: data?.pushName,
    message_type: data?.messageType,
    text_preview: msg ? truncate(extractInboundText(msg) || "", 120) : undefined,
  };
}
