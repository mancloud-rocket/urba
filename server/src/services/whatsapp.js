const WA_MAX_LEN = 4096;

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

export async function sendWhatsApp(to, text) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const dest = String(to).replace(/\D/g, "");

  if (!token || !phoneId) {
    console.log(`[WA demo -> ${dest}]: ${text}`);
    return { ok: true, demo: true };
  }

  const chunks = splitMessage(text);
  let last = null;

  for (const body of chunks) {
    last = await sendWhatsAppChunk(dest, body, token, phoneId);
    if (!last.ok) return last;
  }

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

async function sendWhatsAppChunk(to, body, token, phoneId) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("WhatsApp send error:", res.status, JSON.stringify(data));
    return { ok: false, status: res.status, error: data };
  }
  return { ok: true, data };
}
