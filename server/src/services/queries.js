import { all, get, D } from "../db.js";

export async function getClientBalances() {
  return all(`
    SELECT c.id, c.codigo, c.nombre, c.plazo_dias, c.telefono, c.barrio,
      COALESCE(SUM(CASE WHEN le.tipo = 'cargo' THEN le.monto ELSE 0 END), 0) AS total_cargos,
      COALESCE(SUM(CASE WHEN le.tipo IN ('abono', 'a_cuenta') THEN le.monto ELSE 0 END), 0) AS total_abonos,
      COALESCE(SUM(CASE WHEN le.tipo = 'cargo' THEN le.monto ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN le.tipo IN ('abono', 'a_cuenta') THEN le.monto ELSE 0 END), 0) AS saldo
    FROM clients c
    LEFT JOIN ledger_entries le ON le.client_id = c.id
    WHERE c.activo = ${D.activeTrue()}
    GROUP BY c.id, c.codigo, c.nombre, c.plazo_dias, c.telefono, c.barrio
    ORDER BY saldo DESC
  `);
}

export async function getClientByCodigo(codigo) {
  return get("SELECT * FROM clients WHERE codigo = ?", [codigo]);
}

export async function searchClients(q) {
  const like = `%${q}%`;
  return all(`
    SELECT * FROM clients
    WHERE activo = ${D.activeTrue()} AND (codigo LIKE ? OR nombre LIKE ? OR telefono LIKE ?)
    ORDER BY nombre LIMIT 20
  `, [like, like, like]);
}

export async function getClientLedger(clientId, limit = 50) {
  return all(`
    SELECT * FROM ledger_entries WHERE client_id = ?
    ORDER BY fecha DESC, created_at DESC LIMIT ?
  `, [clientId, limit]);
}

export async function getAgingSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await all(`
    SELECT le.*, c.codigo, c.nombre
    FROM ledger_entries le
    JOIN clients c ON c.id = le.client_id
    WHERE le.tipo = 'cargo' AND le.fecha_vencimiento IS NOT NULL
  `);

  const buckets = { vencido: 0, vence_hoy: 0, de_1_a_3: 0, mas_de_3: 0 };
  let totalVencido = 0;
  const vencidos = [];

  for (const r of rows) {
    const balRow = await get(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'cargo' THEN monto ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN tipo IN ('abono', 'a_cuenta') THEN monto ELSE 0 END), 0) AS saldo
      FROM ledger_entries WHERE client_id = ?
    `, [r.client_id]);
    const saldoCliente = Number(balRow?.saldo) || 0;
    if (saldoCliente <= 0) continue;

    const venc = r.fecha_vencimiento;
    const diff = Math.floor((new Date(venc) - new Date(today)) / 86400000);
    const monto = Math.min(Number(r.monto), saldoCliente);

    if (diff < 0) {
      buckets.vencido += monto;
      totalVencido += monto;
      vencidos.push({ ...r, dias: diff, monto_aplicado: monto });
    } else if (diff === 0) {
      buckets.vence_hoy += monto;
    } else if (diff <= 3) {
      buckets.de_1_a_3 += monto;
    } else {
      buckets.mas_de_3 += monto;
    }
  }

  const balances = await getClientBalances();
  const totalCartera = balances.reduce((s, c) => s + (Number(c.saldo) > 0 ? Number(c.saldo) : 0), 0);

  return {
    buckets,
    total_cartera: totalCartera,
    total_vencido: totalVencido,
    vencidos: vencidos.sort((a, b) => a.dias - b.dias).slice(0, 20),
    fecha_actual: today,
  };
}

export async function getSuppliers() {
  return all("SELECT * FROM suppliers ORDER BY nombre");
}

export async function getSales({ supplierId, clientId, estadoPago } = {}) {
  let sql = `
    SELECT sl.*, s.nombre AS proveedor_nombre, c.codigo AS cliente_codigo, c.nombre AS cliente_nombre
    FROM sales_lines sl
    JOIN suppliers s ON s.id = sl.supplier_id
    LEFT JOIN clients c ON c.id = sl.client_id
    WHERE 1=1
  `;
  const params = [];
  if (supplierId) { sql += " AND sl.supplier_id = ?"; params.push(supplierId); }
  if (clientId) { sql += " AND sl.client_id = ?"; params.push(clientId); }
  if (estadoPago) { sql += " AND sl.estado_pago = ?"; params.push(estadoPago); }
  sql += " ORDER BY sl.fecha_venta DESC, sl.created_at DESC";
  return all(sql, params);
}

export async function getSalesStats() {
  return get(`
    SELECT
      COUNT(*) AS total_lineas,
      COALESCE(SUM(usd_venta), 0) AS total_venta,
      COALESCE(SUM(usd_costo), 0) AS total_costo,
      COALESCE(SUM(usd_venta - usd_costo), 0) AS total_margen,
      COALESCE(SUM(CASE WHEN estado_pago != 'pagado' THEN usd_venta ELSE 0 END), 0) AS pendiente_cobro
    FROM sales_lines
  `);
}

export async function getDashboardStats() {
  const aging = await getAgingSummary();
  const sales = await getSalesStats();
  const countRow = await get(`SELECT COUNT(*) AS n FROM clients WHERE activo = ${D.activeTrue()}`);
  const recentEntries = await all(`
    SELECT le.*, c.codigo, c.nombre
    FROM ledger_entries le JOIN clients c ON c.id = le.client_id
    ORDER BY le.created_at DESC LIMIT 8
  `);
  return { aging, sales, clientCount: Number(countRow?.n) || 0, recentEntries };
}

export async function getAllowedPhones() {
  return all(`SELECT * FROM allowed_phones WHERE activo = ${D.activeTrue()}`);
}

export async function isPhoneAllowed(telefono) {
  const norm = telefono.replace(/\D/g, "");
  const env = (process.env.ALLOWED_PHONES || "")
    .split(",")
    .map((p) => p.replace(/\D/g, ""))
    .filter(Boolean);
  if (env.includes(norm)) return true;
  const row = await get(
    `SELECT 1 AS ok FROM allowed_phones WHERE telefono = ? AND activo = ${D.activeTrue()}`,
    [norm]
  );
  return !!row;
}
