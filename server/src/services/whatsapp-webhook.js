import {
  extractInboundText,
  inboundTypeLabel,
  sendWhatsApp,
} from "../services/whatsapp.js";
import { markdownToWhatsApp } from "../services/format-reply.js";
import { processAgentMessage } from "../services/openai-agent.js";
import { isPhoneAllowed } from "../services/queries.js";
import { log, summarizeWebhookPayload, truncate, maskPhone } from "../services/logger.js";

export function handleWhatsAppWebhookVerify(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  log.info("whatsapp", "webhook.verify_attempt", {
    mode,
    token_match: token === process.env.WHATSAPP_VERIFY_TOKEN,
    has_challenge: Boolean(challenge),
  });

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    log.info("whatsapp", "webhook.verify_ok", { mode });
    return res.status(200).send(challenge);
  }

  log.warn("whatsapp", "webhook.verify_rejected", { mode, reason: "token_or_mode_invalid" });
  return res.sendStatus(403);
}

export async function handleWhatsAppWebhookPost(req, res) {
  const receivedAt = Date.now();

  log.info("whatsapp", "webhook.post_hit", {
    has_body: Boolean(req.body),
    body_keys: req.body ? Object.keys(req.body) : [],
  });

  const summary = summarizeWebhookPayload(req.body);
  log.info("whatsapp", "webhook.received", summary);

  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!entry || !change) {
      log.debug("whatsapp", "webhook.ignored", { reason: "empty_entry_or_change" });
      return;
    }

    if (value?.statuses?.length) {
      for (const st of value.statuses) {
        log.info("whatsapp", "message.status", {
          message_id: st.id,
          status: st.status,
          recipient: maskPhone(st.recipient_id),
          recipient_raw: st.recipient_id,
          timestamp: st.timestamp,
          errors: st.errors,
        });
      }
    }

    const msg = value?.messages?.[0];
    if (!msg) {
      if (!value?.statuses?.length) {
        log.debug("whatsapp", "webhook.no_message", {
          field: change.field,
          keys: value ? Object.keys(value) : [],
        });
      }
      return;
    }

    const from = msg.from.replace(/\D/g, "");
    const text = extractInboundText(msg);
    const allowed = await isPhoneAllowed(from);

    log.info("whatsapp", "message.inbound", {
      message_id: msg.id,
      from: maskPhone(from),
      from_raw: from,
      type: msg.type,
      allowed,
      text_preview: text ? truncate(text, 200) : null,
      text_length: text?.length ?? 0,
      timestamp: msg.timestamp,
    });

    if (!text) {
      log.info("whatsapp", "message.unsupported_type", {
        from: maskPhone(from),
        type: msg.type,
        label: inboundTypeLabel(msg),
        allowed,
      });
      if (allowed) {
        const notice = `URBA solo procesa mensajes de texto por ahora (recibi ${inboundTypeLabel(msg)}).`;
        await sendWhatsApp(from, notice, { inbound_message_id: msg.id });
      } else {
        log.warn("whatsapp", "message.rejected_unauthorized", {
          from: maskPhone(from),
          reason: "unsupported_type_and_not_allowed",
        });
      }
      return;
    }

    if (!allowed) {
      log.warn("whatsapp", "message.rejected_unauthorized", {
        from: maskPhone(from),
        from_raw: from,
        reason: "not_in_allowed_phones",
      });
      await sendWhatsApp(from, "Numero no autorizado en URBA.", { inbound_message_id: msg.id });
      return;
    }

    const agentStarted = Date.now();
    log.info("agent", "process.start", {
      channel: "whatsapp",
      telefono: maskPhone(from),
      telefono_raw: from,
      inbound_message_id: msg.id,
      input_preview: truncate(text, 200),
    });

    const reply = await processAgentMessage(from, text, {
      channel: "whatsapp",
      messageId: msg.id,
    });

    const agentMs = Date.now() - agentStarted;
    log.info("agent", "process.done", {
      channel: "whatsapp",
      telefono: maskPhone(from),
      duration_ms: agentMs,
      reply_preview: truncate(reply, 200),
      reply_length: reply?.length ?? 0,
    });

    const waText = markdownToWhatsApp(reply);
    const sent = await sendWhatsApp(from, waText, {
      inbound_message_id: msg.id,
      reply_length: waText.length,
    });

    log.info("whatsapp", "message.flow_complete", {
      from: maskPhone(from),
      inbound_message_id: msg.id,
      agent_ms: agentMs,
      total_ms: Date.now() - receivedAt,
      send_ok: sent.ok,
      send_demo: sent.demo ?? false,
    });

    if (!sent.ok) {
      log.error("whatsapp", "message.send_failed", {
        to: maskPhone(from),
        to_raw: from,
        status: sent.status,
        error: sent.error,
        inbound_message_id: msg.id,
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
