import { v4 as uuid } from "uuid";
import { all, get } from "../db.js";
import { audit } from "./audit.js";
import { getClientByCodigo } from "./queries.js";
import { createLedgerEntry } from "./mutations.js";
import { run } from "../db.js";

function lineSubtotal(line) {
  const qty = Number(line.cantidad) || 1;
  const pu = Number(line.precio_unitario) || 0;
  return line.subtotal != null ? Number(line.subtotal) : qty * pu;
}

export async function getClientInvoices(clientId) {
  const invoices = await all(`
    SELECT ci.* FROM client_invoices ci
    WHERE ci.client_id = ?
    ORDER BY ci.fecha DESC, ci.created_at DESC
  `, [clientId]);

  const result = [];
  for (const inv of invoices) {
    const lines = await all(
      "SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY descripcion",
      [inv.id]
    );
    result.push({ ...inv, lines });
  }
  return result;
}

export async function createInvoice(data, actor = "web") {
  const client = data.client_id
    ? await get("SELECT * FROM clients WHERE id = ?", [data.client_id])
    : await getClientByCodigo(data.cliente_codigo);
  if (!client) throw new Error("Cliente no encontrado");

  const esGenerica = Boolean(data.es_generica);
  const lines = esGenerica
    ? [{ descripcion: "Mercaderias varias", cantidad: 1, precio_unitario: Number(data.monto), subtotal: Number(data.monto) }]
    : (data.lines || []).map((l) => ({
        ...l,
        subtotal: lineSubtotal(l),
      }));

  if (!lines.length) throw new Error("La factura necesita al menos un item o monto");

  const total = lines.reduce((s, l) => s + lineSubtotal(l), 0);
  if (total <= 0) throw new Error("El monto total debe ser mayor a cero");

  const registrarDeuda = data.registrar_deuda !== false;
  let ledgerEntry = null;

  if (registrarDeuda) {
    ledgerEntry = await createLedgerEntry({
      client_id: client.id,
      tipo: "cargo",
      monto: total,
      referencia: data.referencia,
      observacion: data.observacion || (esGenerica ? "Mercaderias varias" : null),
      fecha: data.fecha,
      enviar_whatsapp: Boolean(data.enviar_whatsapp),
    }, actor);
  }

  const invoiceId = uuid();
  const fecha = data.fecha || new Date().toISOString().slice(0, 10);

  await run(`
    INSERT INTO client_invoices (id, client_id, ledger_entry_id, fecha, es_generica, observacion, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    invoiceId,
    client.id,
    ledgerEntry?.id || null,
    fecha,
    esGenerica ? 1 : 0,
    data.observacion || null,
    actor,
  ]);

  for (const line of lines) {
    await run(`
      INSERT INTO invoice_lines (id, invoice_id, descripcion, cantidad, precio_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      uuid(),
      invoiceId,
      line.descripcion,
      line.cantidad ?? 1,
      line.precio_unitario ?? null,
      lineSubtotal(line),
    ]);
  }

  await audit(actor, "invoice_created", { invoiceId, client: client.codigo, total });

  const invoice = await get("SELECT * FROM client_invoices WHERE id = ?", [invoiceId]);
  const invoiceLines = await all("SELECT * FROM invoice_lines WHERE invoice_id = ?", [invoiceId]);
  return { invoice, lines: invoiceLines, ledger_entry: ledgerEntry };
}
