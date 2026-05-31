const TTL_MS = 120_000;
const FINGERPRINT_TTL_MS = 90_000;
const sent = new Map();
const fingerprints = new Map();

export function markBotMessageSent(messageId) {
  if (!messageId) return;
  sent.set(messageId, Date.now() + TTL_MS);
  if (sent.size > 500) prune(sent);
}

export function isBotMessageSent(messageId) {
  if (!messageId) return false;
  const expiresAt = sent.get(messageId);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    sent.delete(messageId);
    return false;
  }
  return true;
}

function normalizeText(text) {
  return String(text || "").trim().replace(/\s+/g, " ").slice(0, 500);
}

export function markBotReplyFingerprint(to, text) {
  const phone = String(to).replace(/\D/g, "");
  if (!phone || !text) return;
  const key = `${phone}:${normalizeText(text)}`;
  fingerprints.set(key, Date.now() + FINGERPRINT_TTL_MS);
  if (fingerprints.size > 500) prune(fingerprints);
}

export function isBotReplyFingerprint(to, text) {
  const phone = String(to).replace(/\D/g, "");
  const key = `${phone}:${normalizeText(text)}`;
  const expiresAt = fingerprints.get(key);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    fingerprints.delete(key);
    return false;
  }
  return true;
}

function prune(map) {
  const now = Date.now();
  for (const [id, expiresAt] of map) {
    if (now > expiresAt) map.delete(id);
  }
}

export function extractSentMessageIds(data) {
  if (!data) return [];
  const ids = [
    data?.key?.id,
    data?.message?.key?.id,
    data?.messages?.[0]?.key?.id,
  ].filter(Boolean);
  return [...new Set(ids)];
}
