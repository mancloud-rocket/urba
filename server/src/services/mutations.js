import { v4 as uuid } from "uuid";
import { get, run, isPostgres, D } from "../db.js";
import { audit } from "./audit.js";
import { getClientByCodigo } from "./queries.js";

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function createClient(data, actor = "web") {
  const id = uuid();
  await run(`
    INSERT INTO clients (id, codigo, nombre, rut, identificacion, telefono, telefono2,
      direccion, barrio, email, plazo_dias)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.codigo, data.nombre, data.rut || null, data.identificacion || null,
    data.telefono || null, data.telefono2 || null, data.direccion || null,
    data.barrio || null, data.email || null, data.plazo_dias || 7,
  ]);
  await audit(actor, "create_client", { id, codigo: data.codigo });
  return get("SELECT * FROM clients WHERE id = ?", [id]);
}

export async function createLedgerEntry(data, actor = "web") {
  const client = data.client_id
    ? await get("SELECT * FROM clients WHERE id = ?", [data.client_id])
    : await getClientByCodigo(data.cliente_codigo);
  if (!client) throw new Error("Cliente no encontrado");

  const fecha = data.fecha || new Date().toISOString().slice(0, 10);
  let venc = data.fecha_vencimiento;
  if (!venc && data.tipo === "cargo") {
    venc = addDays(fecha, client.plazo_dias);
  }

  const id = uuid();
  await run(`
    INSERT INTO ledger_entries (id, client_id, fecha, referencia, tipo, monto,
      medio_pago, fecha_vencimiento, observacion, estado, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, client.id, fecha, data.referencia || null, data.tipo, data.monto,
    data.medio_pago || null, venc || null, data.observacion || null,
    data.estado || (data.tipo === "cargo" ? "Debe" : "Pago"), actor,
  ]);
  await audit(actor, "ledger_entry", { id, client: client.codigo, tipo: data.tipo, monto: data.monto });
  return get(`
    SELECT le.*, c.codigo, c.nombre FROM ledger_entries le
    JOIN clients c ON c.id = le.client_id WHERE le.id = ?
  `, [id]);
}

export async function createSaleLine(data, actor = "web") {
  const id = uuid();
  const client = data.client_id
    ? { id: data.client_id }
    : data.cliente_codigo
      ? await getClientByCodigo(data.cliente_codigo)
      : null;

  await run(`
    INSERT INTO sales_lines (id, supplier_id, client_id, codigo_producto, producto,
      usd_venta, usd_costo, iva, nro_factura, modalidad, estado_venta, fecha_venta,
      estado_pago, fecha_pago, banco, nro_transaccion, nro_recibo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.supplier_id, client?.id || null, data.codigo_producto || null,
    data.producto, data.usd_venta || 0, data.usd_costo || 0, data.iva || null,
    data.nro_factura || null, data.modalidad || null, data.estado_venta || "otro",
    data.fecha_venta || new Date().toISOString().slice(0, 10),
    data.estado_pago || "pendiente", data.fecha_pago || null,
    data.banco || null, data.nro_transaccion || null, data.nro_recibo || null,
  ]);

  if (data.crear_cargo && client?.id && data.usd_venta > 0) {
    await createLedgerEntry({
      client_id: client.id,
      tipo: "cargo",
      monto: data.usd_venta,
      referencia: data.nro_factura || data.producto,
      observacion: `Venta: ${data.producto}`,
    }, actor);
  }

  await audit(actor, "create_sale", { id, producto: data.producto });
  return get(`
    SELECT sl.*, s.nombre AS proveedor_nombre FROM sales_lines sl
    JOIN suppliers s ON s.id = sl.supplier_id WHERE sl.id = ?
  `, [id]);
}

export async function savePendingConfirmation(telefono, actionType, payload) {
  const id = uuid();
  const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const payloadVal = isPostgres() ? payload : JSON.stringify(payload);
  await run(`
    INSERT INTO pending_confirmations (id, telefono, action_type, payload, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `, [id, telefono, actionType, payloadVal, expires]);
  return id;
}

export async function consumePendingConfirmation(telefono) {
  const row = await get(`
    SELECT * FROM pending_confirmations
    WHERE telefono = ? AND expires_at > ${D.now()}
    ORDER BY created_at DESC LIMIT 1
  `, [telefono]);
  if (!row) return null;
  await run("DELETE FROM pending_confirmations WHERE id = ?", [row.id]);
  const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
  return { ...row, payload };
}

export async function executeConfirmedAction(actionType, payload, actor) {
  switch (actionType) {
    case "registrar_cargo":
      return createLedgerEntry({ ...payload, tipo: "cargo" }, actor);
    case "registrar_abono":
      return createLedgerEntry({ ...payload, tipo: "abono" }, actor);
    case "crear_cliente":
      return createClient(payload, actor);
    case "registrar_venta":
      return createSaleLine(payload, actor);
    default:
      throw new Error("Accion desconocida");
  }
}
