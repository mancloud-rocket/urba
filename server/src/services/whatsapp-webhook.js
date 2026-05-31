import { handleInboundWhatsAppMessage } from "./whatsapp-inbound.js";
import {
  extractInboundText,
  inboundTypeLabel,
  jidToPhone,
  summarizeWebhookPayload,
} from "./whatsapp.js";
import { isBotMessageSent } from "./whatsapp-sent-cache.js";
import { log, truncate, maskPhone } from "./logger.js";

function resolveSenderPhone(body, item, key) {
  const remoteJid = key.remoteJid || "";
  if (key.fromMe) {
    return (
      jidToPhone(body?.sender) ||
      jidToPhone(key.senderPn) ||
      jidToPhone(item.senderPn) ||
      jidToPhone(remoteJid)
    );
  }
  return (
    jidToPhone(key.senderPn) ||
    jidToPhone(item.senderPn) ||
    jidToPhone(remoteJid)
  );
}

const UPSERT_EVENTS = new Set(["messages.upsert"]);

function isUpsertEvent(event) {
  return UPSERT_EVENTS.has(String(event || "").toLowerCase().replace(/_/g, "."));
}

function webhookAuthorized(req) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!secret) return true;
  const headerKey = req.get("apikey") || req.get("x-evolution-api-key");
  return headerKey === secret;
}

function normalizeWebhookData(body) {
  const data = body?.data;
  if (!data) return [];

  if (Array.isArray(data.messages)) {
    return data.messages.map((item) => ({
      key: item.key,
      message: item.message,
      messageType: item.messageType,
      pushName: item.pushName,
      senderPn: item.senderPn,
    }));
  }

  if (data.key || data.message) {
    return [data];
  }

  return [];
}

export function handleWhatsAppWebhookGet(_req, res) {
  res.json({
    ok: true,
    provider: "evolution",
    note: "Configurar webhook POST en la instancia Evolution apuntando a esta URL",
  });
}

export async function handleWhatsAppWebhookPost(req, res) {
  const receivedAt = Date.now();

  if (!webhookAuthorized(req)) {
    log.warn("whatsapp", "webhook.rejected", { reason: "invalid_secret" });
    return res.sendStatus(403);
  }

  log.info("whatsapp", "webhook.post_hit", {
    has_body: Boolean(req.body),
    body_keys: req.body ? Object.keys(req.body) : [],
  });

  const summary = summarizeWebhookPayload(req.body);
  log.info("whatsapp", "webhook.received", summary);

  res.sendStatus(200);

  try {
    const event = req.body?.event;
    if (!isUpsertEvent(event)) {
      log.debug("whatsapp", "webhook.ignored", {
        event,
        reason: "not_messages_upsert",
      });
      return;
    }

    const items = normalizeWebhookData(req.body);
    if (!items.length) {
      log.debug("whatsapp", "webhook.ignored", { reason: "empty_data" });
      return;
    }

    for (const item of items) {
      const key = item.key || {};
      const messageId = key.id || `evo_${Date.now()}`;

      if (key.fromMe && isBotMessageSent(messageId)) {
        log.debug("whatsapp", "webhook.ignored", {
          reason: "bot_echo",
          message_id: messageId,
        });
        continue;
      }

      const remoteJid = key.remoteJid || "";
      if (remoteJid.endsWith("@g.us") || remoteJid.endsWith("@broadcast")) {
        log.debug("whatsapp", "webhook.ignored", {
          reason: "group_or_broadcast",
          remote_jid: remoteJid,
        });
        continue;
      }

      const from = resolveSenderPhone(req.body, item, key);

      if (!from) {
        log.warn("whatsapp", "webhook.no_sender", { remote_jid: remoteJid, from_me: key.fromMe });
        continue;
      }

      if (key.fromMe) {
        log.info("whatsapp", "message.from_me", {
          message_id: messageId,
          from: maskPhone(from),
          remote_jid: remoteJid,
        });
      }

      const message = item.message || {};
      const text = extractInboundText(message);
      const typeLabel = inboundTypeLabel(message);

      await handleInboundWhatsAppMessage({
        from,
        text,
        messageId,
        msgType: text ? "text" : item.messageType || "unknown",
        typeLabel: text ? undefined : typeLabel,
        receivedAt,
      });
    }
  } catch (e) {
    log.error("whatsapp", "webhook.handler_error", {
      error: e.message,
      stack: truncate(e.stack, 600),
      summary,
    });
  }
}
