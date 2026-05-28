import OpenAI from "openai";
import { TOOL_DEFINITIONS, runTool, handleConfirmation } from "./agent.js";
import { SYSTEM_PROMPT } from "./agent-prompt.js";
import { resolveClientCodigo } from "./client-search.js";

const MAX_TOOL_ROUNDS = 10;
const MAX_HISTORY = 14;
const sessions = new Map();

function getSession(telefono) {
  if (!sessions.has(telefono)) sessions.set(telefono, []);
  return sessions.get(telefono);
}

function pushSession(telefono, userText, assistantText) {
  const hist = getSession(telefono);
  hist.push({ role: "user", content: userText });
  hist.push({ role: "assistant", content: assistantText });
  while (hist.length > MAX_HISTORY) hist.shift();
}

export async function processAgentMessage(telefono, userText) {
  const confirm = await handleConfirmation(telefono, userText, `wa:${telefono}`);
  if (confirm) {
    if (confirm.error) return confirm.error;
    const msg = `Listo. ${confirm.accion === "registrar_cargo" ? "Cargo" : confirm.accion === "registrar_abono" ? "Abono" : "Operacion"} registrado correctamente.`;
    pushSession(telefono, userText, msg);
    return msg;
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallbackReply(userText, telefono);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const history = getSession(telefono);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userText },
  ];

  for (let i = 0; i < MAX_TOOL_ROUNDS; i++) {
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
      temperature: 0.3,
    });

    const msg = res.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls?.length) {
      const reply = msg.content || "No pude procesar tu consulta.";
      pushSession(telefono, userText, reply);
      return reply;
    }

    for (const tc of msg.tool_calls) {
      let args = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        args = {};
      }
      const result = await runTool(tc.function.name, args, telefono);
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
      if (result.pendiente_confirmacion) {
        pushSession(telefono, userText, result.mensaje);
        return result.mensaje;
      }
    }
  }

  const fallback = "Consulta muy larga. Proba de nuevo con una pregunta mas concreta.";
  pushSession(telefono, userText, fallback);
  return fallback;
}

async function fallbackReply(text, telefono) {
  const t = text.toLowerCase();

  if (t.includes("vencid")) {
    const aging = await runTool("listar_vencidos", {}, telefono);
    return `Cartera: $${Number(aging.total_cartera).toLocaleString("es-UY")}. Vencido: $${Number(aging.total_vencido).toLocaleString("es-UY")}. (Modo demo — configura OPENAI_API_KEY)`;
  }

  const nameMatch = t.match(
    /(?:debe|deuda|saldo|info|datos|ficha|cliente|cuanto|cuánto|cobra|cobrar|fiado|fiar|abono|cobro).*?(?:de|del|a|para)\s+([a-záéíóúñ\s]{2,40})/i
  );
  const query = nameMatch?.[1]?.trim() || extractNameHint(t);

  if (query) {
    const resolved = await resolveClientCodigo(query);
    if (resolved.encontrado && resolved.unico) {
      const data = await runTool("saldo_cliente", { busqueda: resolved.codigo }, telefono);
      if (data.saldo != null) {
        return `${data.cliente?.nombre} (${data.cliente?.codigo}): saldo $${Number(data.saldo).toLocaleString("es-UY")}. (Modo demo)`;
      }
    }
    if (resolved.candidatos?.length) {
      const list = resolved.candidatos.map((c) => `${c.nombre} ${c.codigo}`).join(", ");
      return `Encontre: ${list}. Configura OPENAI_API_KEY para el agente completo.`;
    }
  }

  return "URBA en modo demo. Configura OPENAI_API_KEY. Proba: 'cuanto debe andres' o 'quien esta vencido'.";
}

function extractNameHint(t) {
  const words = ["andres", "franco", "fabiana", "rosmary", "ricardo", "gerardo", "del bove", "yozzi"];
  for (const w of words) {
    if (t.includes(w)) return w;
  }
  return null;
}
