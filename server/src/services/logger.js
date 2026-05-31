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
