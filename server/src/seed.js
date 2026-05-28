import "dotenv/config";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { fileURLToPath } from "url";
import { get, run, isPostgres, initDb, closeDb } from "./db.js";
import { audit } from "./services/audit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "../data/seed.json");

export async function seedDatabase() {
  if (!fs.existsSync(seedPath)) {
    console.log("No hay seed.json. Ejecuta: python scripts/migrate_from_excel.py");
    return;
  }

  const data = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  const force = process.env.FORCE_SEED === "1";
  const countRow = await get("SELECT COUNT(*) AS n FROM clients");
  const count = Number(countRow?.n) || 0;

  if (count > 0 && !force) {
    console.log("Base ya tiene datos, omitiendo seed.");
    return;
  }

  if (force && count > 0) {
    console.log("FORCE_SEED=1: limpiando tablas...");
    const tables = [
      "pending_confirmations",
      "sales_lines",
      "ledger_entries",
      "audit_log",
      "allowed_phones",
      "clients",
      "suppliers",
    ];
    for (const t of tables) {
      await run(`DELETE FROM ${t}`);
    }
  }

  const supplierIds = {};
  for (const s of data.suppliers) {
    const id = uuid();
    supplierIds[s.nombre] = id;
    await run("INSERT INTO suppliers (id, nombre) VALUES (?, ?)", [id, s.nombre]);
  }

  const clientIds = {};
  for (const c of data.clients) {
    const id = uuid();
    clientIds[c.codigo] = id;
    await run(`
      INSERT INTO clients (id, codigo, nombre, rut, identificacion, telefono, telefono2,
        direccion, barrio, email, plazo_dias)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, c.codigo, c.nombre, c.rut, c.identificacion,
      c.telefono ? String(c.telefono) : null,
      c.telefono2 ? String(c.telefono2) : null,
      c.direccion, c.barrio, c.email, c.plazo_dias,
    ]);
  }

  for (const e of data.ledger_entries) {
    const cid = clientIds[e.cliente_codigo];
    if (!cid) continue;
    await run(`
      INSERT INTO ledger_entries (id, client_id, fecha, referencia, tipo, monto,
        medio_pago, fecha_vencimiento, observacion, estado, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      uuid(), cid, e.fecha, e.referencia, e.tipo, e.monto,
      e.medio_pago, e.fecha_vencimiento, e.observacion, e.estado, "migration",
    ]);
  }

  for (const s of data.sales_lines) {
    const sid = supplierIds[s.proveedor];
    const cid = s.cliente_codigo ? clientIds[s.cliente_codigo] : null;
    if (!sid) continue;
    await run(`
      INSERT INTO sales_lines (id, supplier_id, client_id, codigo_producto, producto,
        usd_venta, usd_costo, iva, nro_factura, modalidad, estado_venta, fecha_venta,
        estado_pago, fecha_pago, banco, nro_transaccion, nro_recibo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      uuid(), sid, cid, s.codigo_producto, s.producto,
      s.usd_venta, s.usd_costo, s.iva, s.nro_factura, s.modalidad,
      s.estado_venta, s.fecha_venta, s.estado_pago, s.fecha_pago,
      s.banco, s.nro_transaccion, s.nro_recibo,
    ]);
  }

  for (const p of data.allowed_phones || []) {
    await run(
      "INSERT INTO allowed_phones (id, telefono, nombre) VALUES (?, ?, ?)",
      [uuid(), p.telefono, p.nombre]
    );
  }

  await audit("system", "seed", {
    clients: data.clients.length,
    entries: data.ledger_entries.length,
    driver: isPostgres() ? "postgres" : "sqlite",
  });
  console.log(`Seed completado (${isPostgres() ? "Supabase" : "SQLite"}).`);
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  (async () => {
    await initDb();
    await seedDatabase();
    await closeDb();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
