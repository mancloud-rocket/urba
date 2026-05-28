import OpenAI from "openai";
import { TOOL_DEFINITIONS, runTool, handleConfirmation } from "./agent.js";

const SYSTEM_PROMPT = `Sos el agente de URBA, cuenta corriente para barracas de materiales de construccion.
Reglas:
- Responde en espanol rioplatense, claro y breve.
- NUNCA inventes saldos: usa herramientas para consultar datos reales.
- Para cargos y abonos usa preparar_cargo o preparar_abono (requieren confirmacion SI del usuario).
- Montos en pesos uruguayos salvo que digan USD.
- Si el usuario pregunta deuda, usa saldo_cliente o buscar_cliente primero.
- Formatea montos con separador de miles.`;

export async function processAgentMessage(telefono, userText) {
  const confirm = await handleConfirmation(telefono, userText, `wa:${telefono}`);
  if (confirm) {
    if (confirm.error) return confirm.error;
    return `Listo. ${confirm.accion} registrado correctamente.`;
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallbackReply(userText, telefono);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userText },
  ];

  for (let i = 0; i < 5; i++) {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
    });

    const msg = res.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls?.length) {
      return msg.content || "No pude procesar tu consulta.";
    }

    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments || "{}");
      const result = await runTool(tc.function.name, args, telefono);
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
      if (result.pendiente_confirmacion) {
        return result.mensaje;
      }
    }
  }

  return "Consulta procesada.";
}

async function fallbackReply(text, telefono) {
  const t = text.toLowerCase();
  if (t.includes("vencid") || t.includes("deud")) {
    const aging = await runTool("listar_vencidos", {}, telefono);
    return `Cartera total: $${Number(aging.total_cartera).toLocaleString("es-UY")}. Vencido: $${Number(aging.total_vencido).toLocaleString("es-UY")}. (Modo demo sin OpenAI)`;
  }
  if (t.includes("franco") || t.includes("c01")) {
    const data = await runTool("saldo_cliente", { codigo: "C01" }, telefono);
    return `${data.cliente?.nombre}: saldo $${Number(data.saldo).toLocaleString("es-UY")}. (Modo demo sin OpenAI)`;
  }
  return "URBA activo en modo demo. Configura OPENAI_API_KEY para el agente completo. Prueba: 'cuanto debe C01' o 'quien esta vencido'.";
}
