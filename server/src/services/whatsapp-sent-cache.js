const TTL_MS = 120_000;
const sent = new Map();

export function markBotMessageSent(messageId) {
  if (!messageId) return;
  sent.set(messageId, Date.now() + TTL_MS);
  if (sent.size > 500) prune();
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

function prune() {
  const now = Date.now();
  for (const [id, expiresAt] of sent) {
    if (now > expiresAt) sent.delete(id);
  }
}
