const WA_MAX_LEN = 4096;

import { log, truncate, maskPhone } from "./logger.js";

export function extractInboundText(msg) {
  if (!msg) return null;
  if (msg.type === "text" && msg.text?.body) return msg.text.body.trim();
  return null;
}

export function inboundTypeLabel(msg) {
  if (!msg?.type) return "desconocido";
  const labels = {
    audio: "audio",
    image: "imagen",
    video: "video",
    document: "documento",
    sticker: "sticker",
    location: "ubicacion",
    contacts: "contacto",
    interactive: "boton/lista",
    button: "boton",
  };
  return labels[msg.type] || msg.type;
}

export async function sendWhatsApp(to, text, meta = {}) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const dest = String(to).replace(/\D/g, "");

  if (!token || !phoneId) {
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
    phone_number_id: phoneId,
    ...meta,
  });

  let last = null;
  for (let i = 0; i < chunks.length; i++) {
    last = await sendWhatsAppChunk(dest, chunks[i], token, phoneId, i + 1, chunks.length, meta);
    if (!last.ok) return last;
  }

  log.info("whatsapp", "send.ok", {
    to: maskPhone(dest),
    chunks: chunks.length,
    wa_message_id: last?.data?.messages?.[0]?.id,
    ...meta,
  });

  return last || { ok: true };
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

async function sendWhatsAppChunk(to, body, token, phoneId, chunkIndex, chunkTotal, meta) {
  const started = Date.now();
  let res;
  let data = {};

  try {
    res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
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

  log.debug("whatsapp", "send.chunk_ok", {
    to: maskPhone(to),
    chunk: `${chunkIndex}/${chunkTotal}`,
    wa_message_id: data?.messages?.[0]?.id,
    duration_ms: Date.now() - started,
  });

  return { ok: true, data };
}
