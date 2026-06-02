import OpenAI from "openai";
import { TOOL_DEFINITIONS, runTool, handleConfirmation } from "./agent.js";
import { SYSTEM_PROMPT } from "./agent-prompt.js";
import { resolveClientCodigo } from "./client-search.js";
import { savePendingConfirmation } from "./mutations.js";
import { get } from "../db.js";
import { getClientByCodigo } from "./queries.js";
import { ledgerLabel } from "../lib/ledger-labels.js";
import { log, truncate, maskPhone } from "./logger.js";

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

export async function processAgentMessage(telefono, userText, context = {}) {
  const channel = context.channel || "unknown";
  const ctx = {
    channel,
    telefono: maskPhone(telefono),
    telefono_raw: telefono,
    message_id: context.messageId,
  };

  const actor = `${channel}:${telefono}`;
  const confirm = await handleConfirmation(telefono, userText, actor);
  if (confirm) {
    if (confirm.error) {
      log.warn("agent", "confirm.rejected", { ...ctx, reason: confirm.error });
      return confirm.error;
    }
    log.info("agent", "confirm.executed", { ...ctx, action: confirm.accion });

    if (confirm.accion === "aviso_omitido") {
      const msg = "Listo, no se envio aviso al cliente.";
      pushSession(telefono, userText, msg);
      return msg;
    }
    if (confirm.accion === "enviar_aviso") {
      const r = confirm.result;
      const msg = r?.sent
        ? "Aviso enviado al cliente por WhatsApp."
        : r?.skipped
          ? "No se pudo avisar: el cliente no tiene telefono cargado."
          : `No se pudo enviar el aviso: ${r?.error || "error"}`;
      pushSession(telefono, userText, msg);
      return msg;
    }

    let msg = "Listo. Operacion registrada correctamente.";
    if (confirm.needs_aviso && confirm.result) {
      const entry = confirm.result.ledger_entry || confirm.result;
      const client = entry.client_id
        ? await get("SELECT * FROM clients WHERE id = ?", [entry.client_id])
        : await getClientByCodigo(entry.codigo);
      if (client?.telefono) {
        const tipo = entry.tipo === "abono" ? "cobranza" : "factura";
        await savePendingConfirmation(telefono, "enviar_aviso", { client, entry, tipo });
        msg = `Listo. ${ledgerLabel(entry.tipo)} registrada. ¿Mando aviso al cliente por WhatsApp? Responde SI o NO.`;
      } else {
        msg = `Listo. ${ledgerLabel(entry.tipo)} registrada. (Cliente sin telefono, no se puede avisar por WhatsApp.)`;
      }
    } else if (confirm.result?.tipo) {
      msg = `Listo. ${ledgerLabel(confirm.result.tipo)} registrada correctamente.`;
    }

    pushSession(telefono, userText, msg);
    return msg;
  }

  if (!process.env.OPENAI_API_KEY) {
    log.warn("agent", "fallback.demo_mode", { ...ctx, input_preview: truncate(userText, 120) });
    return fallbackReply(userText, telefono);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const history = getSession(telefono);

  log.info("agent", "openai.request_start", {
    ...ctx,
    model,
    history_messages: history.length,
    input_preview: truncate(userText, 200),
  });

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userText },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const roundStarted = Date.now();
    let res;

    try {
      res = await openai.chat.completions.create({
        model,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: "auto",
        temperature: 0.3,
      });
    } catch (e) {
      log.error("agent", "openai.request_error", {
        ...ctx,
        round: round + 1,
        error: e.message,
        duration_ms: Date.now() - roundStarted,
      });
      const errMsg = "Error temporal del agente. Intenta de nuevo en unos segundos.";
      pushSession(telefono, userText, errMsg);
      return errMsg;
    }

    const msg = res.choices[0].message;
    messages.push(msg);

    log.info("agent", "openai.response", {
      ...ctx,
      round: round + 1,
      duration_ms: Date.now() - roundStarted,
      finish_reason: res.choices[0].finish_reason,
      tool_calls: msg.tool_calls?.map((t) => t.function.name) ?? [],
      usage: res.usage,
      content_preview: msg.content ? truncate(msg.content, 120) : null,
    });

    if (!msg.tool_calls?.length) {
      const reply = msg.content || "No pude procesar tu consulta.";
      pushSession(telefono, userText, reply);
      log.info("agent", "reply.final", {
        ...ctx,
        rounds: round + 1,
        reply_preview: truncate(reply, 200),
      });
      return reply;
    }

    for (const tc of msg.tool_calls) {
      let args = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch (e) {
        log.warn("agent", "tool.args_parse_error", {
          ...ctx,
          tool: tc.function.name,
          error: e.message,
          raw: truncate(tc.function.arguments, 100),
        });
        args = {};
      }

      const toolStarted = Date.now();
      const result = await runTool(tc.function.name, args, telefono, context);

      log.info("agent", "tool.executed", {
        ...ctx,
        tool: tc.function.name,
        args,
        duration_ms: Date.now() - toolStarted,
        result_preview: truncate(JSON.stringify(result), 300),
        pending_confirmation: Boolean(result.pendiente_confirmacion),
        error: result.error,
      });

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });

      if (result.pendiente_confirmacion) {
        pushSession(telefono, userText, result.mensaje);
        log.info("agent", "confirm.pending", {
          ...ctx,
          tool: tc.function.name,
          preview: truncate(result.mensaje, 200),
        });
        return result.mensaje;
      }
    }
  }

  log.warn("agent", "max_rounds_exceeded", { ...ctx, max_rounds: MAX_TOOL_ROUNDS });
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
