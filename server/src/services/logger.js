const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVELS.info;

function emit(level, category, event, data = {}) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    category,
    event,
    ...data,
  };

  const line = `[URBA] ${JSON.stringify(entry)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function truncate(text, max = 400) {
  const s = String(text ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}...[truncated ${s.length - max} chars]`;
}

export function maskPhone(phone) {
  const d = String(phone ?? "").replace(/\D/g, "");
  if (d.length <= 4) return d;
  return `${d.slice(0, 3)}***${d.slice(-3)}`;
}

export const log = {
  debug: (category, event, data) => emit("debug", category, event, data),
  info: (category, event, data) => emit("info", category, event, data),
  warn: (category, event, data) => emit("warn", category, event, data),
  error: (category, event, data) => emit("error", category, event, data),
};

export function summarizeWebhookPayload(body) {
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value ?? {};
  const msg = value.messages?.[0];
  const status = value.statuses?.[0];

  return {
    object: body?.object,
    entry_id: entry?.id,
    field: change?.field,
    metadata: value.metadata
      ? {
          phone_number_id: value.metadata.phone_number_id,
          display_phone_number: value.metadata.display_phone_number,
        }
      : undefined,
    message: msg
      ? {
          id: msg.id,
          from: msg.from,
          type: msg.type,
          timestamp: msg.timestamp,
          text_preview: msg.text?.body ? truncate(msg.text.body, 120) : undefined,
        }
      : undefined,
    status: status
      ? {
          id: status.id,
          status: status.status,
          recipient_id: status.recipient_id,
          timestamp: status.timestamp,
          errors: status.errors,
        }
      : undefined,
    messages_count: value.messages?.length ?? 0,
    statuses_count: value.statuses?.length ?? 0,
  };
}
