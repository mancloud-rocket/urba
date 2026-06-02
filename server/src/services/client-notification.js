import { v4 as uuid } from "uuid";
import { get, run, isPostgres } from "../db.js";
import { sendWhatsApp } from "./whatsapp.js";
import { getClientBalances } from "./queries.js";
import { audit } from "./audit.js";

function boolSent() {
  return isPostgres() ? true : 1;
}

function boolFail() {
  return isPostgres() ? false : 0;
}

function normalizePhone(tel) {
  return (tel || "").replace(/\D/g, "");
}

export function buildClientNotificationMessage(tipo, client, entry, saldo) {
  const monto = Number(entry.monto).toLocaleString("es-UY");
  const saldoStr = Number(saldo).toLocaleString("es-UY");
  const ref = entry.referencia ? ` Ref: ${entry.referencia}.` : "";
  if (tipo === "cobranza" || entry.tipo === "abono") {
    return `Solymar: registramos su pago de $${monto}.${ref} Saldo actual: $${saldoStr}.`;
  }
  return `Solymar: registramos factura de $${monto}.${ref} Saldo actual: $${saldoStr}.`;
}

export async function getClientSaldo(clientId) {
  const balances = await getClientBalances();
  const row = balances.find((b) => b.id === clientId);
  return Number(row?.saldo) || 0;
}

export async function previewNotification({ client_id, cliente_codigo, tipo, monto, referencia }) {
  let client = null;
  if (client_id) {
    client = await get("SELECT * FROM clients WHERE id = ?", [client_id]);
  } else if (cliente_codigo) {
    client = await get("SELECT * FROM clients WHERE codigo = ?", [cliente_codigo]);
  }
  if (!client) throw new Error("Cliente no encontrado");
  if (!client.telefono) return { preview: null, skipped: true, reason: "sin_telefono" };

  const saldo = await getClientSaldo(client.id);
  const entry = { tipo: tipo === "cobranza" ? "abono" : "cargo", monto, referencia };
  return {
    preview: buildClientNotificationMessage(tipo, client, entry, saldo),
    telefono: client.telefono,
  };
}

export async function sendClientNotification({ client, entry, tipo }, actor = "system") {
  const tel = normalizePhone(client.telefono);
  if (!tel) return { skipped: true, reason: "sin_telefono" };

  const saldo = await getClientSaldo(client.id);
  const mensaje = buildClientNotificationMessage(tipo, client, entry, saldo);
  const logId = uuid();

  try {
    await sendWhatsApp(tel, mensaje);
    await run(`
      INSERT INTO notification_log (id, client_id, ledger_entry_id, telefono, tipo, mensaje, enviado)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [logId, client.id, entry.id, tel, tipo, mensaje, boolSent()]);
    await audit(actor, "notification_sent", { logId, client: client.codigo, tipo });
    return { sent: true, mensaje, logId };
  } catch (err) {
    await run(`
      INSERT INTO notification_log (id, client_id, ledger_entry_id, telefono, tipo, mensaje, enviado, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [logId, client.id, entry.id, tel, tipo, mensaje, boolFail(), err.message]);
    return { sent: false, error: err.message };
  }
}
