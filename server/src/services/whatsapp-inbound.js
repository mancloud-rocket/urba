import { sendWhatsApp } from "./whatsapp.js";
import { markdownToWhatsApp } from "./format-reply.js";
import { processAgentMessage } from "./openai-agent.js";
import { isPhoneAllowed, getAppUserByPhone } from "./queries.js";
import { log, truncate, maskPhone } from "./logger.js";

export async function handleInboundWhatsAppMessage({
  from,
  text,
  messageId,
  msgType = "text",
  typeLabel,
  receivedAt = Date.now(),
}) {
  const allowed = await isPhoneAllowed(from);

  log.info("whatsapp", "message.inbound", {
    message_id: messageId,
    from: maskPhone(from),
    from_raw: from,
    type: msgType,
    allowed,
    text_preview: text ? truncate(text, 200) : null,
    text_length: text?.length ?? 0,
  });

  if (!text) {
    log.info("whatsapp", "message.unsupported_type", {
      from: maskPhone(from),
      type: msgType,
      label: typeLabel || msgType,
      allowed,
    });
    if (allowed && typeLabel) {
      const notice = `URBA solo procesa mensajes de texto por ahora (recibi ${typeLabel}).`;
      await sendWhatsApp(from, notice, { inbound_message_id: messageId });
    } else if (!allowed) {
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
    return;
  }

  const agentStarted = Date.now();
  log.info("agent", "process.start", {
    channel: "whatsapp",
    telefono: maskPhone(from),
    telefono_raw: from,
    inbound_message_id: messageId,
    input_preview: truncate(text, 200),
  });

  const appUser = await getAppUserByPhone(from);
  const reply = await processAgentMessage(from, text, {
    channel: "whatsapp",
    messageId,
    userRol: appUser?.rol || "admin",
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
    inbound_message_id: messageId,
    reply_length: waText.length,
  });

  log.info("whatsapp", "message.flow_complete", {
    from: maskPhone(from),
    inbound_message_id: messageId,
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
      inbound_message_id: messageId,
    });
  }
}
