import Database from "better-sqlite3";
import pg from "pg";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString =
  process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "";

const hasPgPassword = Boolean(process.env.SUPABASE_DB_PASSWORD);

export const driver =
  connectionString || hasPgPassword ? "postgres" : "sqlite";

let sqliteDb = null;
let pgPool = null;

function pgSsl() {
  return process.env.DATABASE_SSL === "false"
    ? false
    : { rejectUnauthorized: false };
}

function buildPgConfig() {
  if (hasPgPassword) {
    const host = process.env.SUPABASE_DB_HOST;
    const user = process.env.SUPABASE_DB_USER;
    if (!host || !user) {
      throw new Error(
        "Con SUPABASE_DB_PASSWORD tambien necesitas SUPABASE_DB_HOST y SUPABASE_DB_USER. " +
        "Copialos desde Supabase > Project Settings > Database > Connection string."
      );
    }
    return {
      host,
      port: Number(process.env.SUPABASE_DB_PORT || 5432),
      user,
      password: process.env.SUPABASE_DB_PASSWORD,
      database: process.env.SUPABASE_DB_NAME || "postgres",
      ssl: pgSsl(),
    };
  }

  if (!connectionString.startsWith("postgres")) {
    throw new Error(
      "DATABASE_URL invalida: debe empezar con postgresql:// (URI de Postgres). " +
      "No uses la URL del proyecto Supabase (https://....supabase.co). " +
      "Si tu password tiene $, @, # u otros simbolos, usa SUPABASE_DB_PASSWORD en lugar de DATABASE_URL. " +
      "Obtenela en Supabase > Project Settings > Database > Connection string > URI."
    );
  }

  return { connectionString, ssl: pgSsl() };
}

export function isPostgres() {
  return driver === "postgres";
}

export const D = {
  now: () => (isPostgres() ? "NOW()" : "datetime('now')"),
  activeTrue: () => (isPostgres() ? "TRUE" : "1"),
};

function toPgPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function initSqlite() {
  const dbPath =
    process.env.DATABASE_PATH || path.join(__dirname, "../data/balde.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("foreign_keys = ON");
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      codigo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      rut TEXT,
      identificacion TEXT,
      telefono TEXT,
      telefono2 TEXT,
      direccion TEXT,
      barrio TEXT,
      email TEXT,
      plazo_dias INTEGER NOT NULL DEFAULT 7,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      fecha TEXT NOT NULL,
      referencia TEXT,
      tipo TEXT NOT NULL CHECK (tipo IN ('cargo', 'abono', 'a_cuenta', 'pago_contado')),
      monto REAL NOT NULL CHECK (monto >= 0),
      medio_pago TEXT,
      fecha_vencimiento TEXT,
      observacion TEXT,
      estado TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales_lines (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      client_id TEXT REFERENCES clients(id),
      codigo_producto TEXT,
      producto TEXT NOT NULL,
      usd_venta REAL,
      usd_costo REAL,
      iva REAL,
      nro_factura TEXT,
      modalidad TEXT,
      estado_venta TEXT DEFAULT 'otro',
      fecha_venta TEXT,
      estado_pago TEXT DEFAULT 'pendiente',
      fecha_pago TEXT,
      banco TEXT,
      nro_transaccion TEXT,
      nro_recibo TEXT,
      ledger_entry_id TEXT REFERENCES ledger_entries(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS allowed_phones (
      id TEXT PRIMARY KEY,
      telefono TEXT NOT NULL UNIQUE,
      nombre TEXT,
      activo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS pending_confirmations (
      id TEXT PRIMARY KEY,
      telefono TEXT NOT NULL,
      action_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ledger_client ON ledger_entries(client_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_venc ON ledger_entries(fecha_vencimiento);
    CREATE INDEX IF NOT EXISTS idx_sales_supplier ON sales_lines(supplier_id);
  `);
  migrateSqliteExtensions();
  console.log(`SQLite local: ${dbPath}`);
}

function migrateSqliteExtensions() {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS client_invoices (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      ledger_entry_id TEXT REFERENCES ledger_entries(id),
      fecha TEXT NOT NULL,
      es_generica INTEGER NOT NULL DEFAULT 0,
      observacion TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoice_lines (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES client_invoices(id) ON DELETE CASCADE,
      descripcion TEXT NOT NULL,
      cantidad REAL NOT NULL DEFAULT 1,
      precio_unitario REAL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_log (
      id TEXT PRIMARY KEY,
      client_id TEXT REFERENCES clients(id),
      ledger_entry_id TEXT REFERENCES ledger_entries(id),
      telefono TEXT NOT NULL,
      tipo TEXT NOT NULL,
      mensaje TEXT,
      enviado INTEGER DEFAULT 0,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cash_closures (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL UNIQUE,
      cerrado_por TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'borrador',
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cash_closure_lines (
      id TEXT PRIMARY KEY,
      closure_id TEXT NOT NULL REFERENCES cash_closures(id) ON DELETE CASCADE,
      categoria TEXT NOT NULL,
      monto REAL NOT NULL,
      es_ingreso INTEGER NOT NULL DEFAULT 1,
      referencia TEXT,
      origen TEXT NOT NULL DEFAULT 'manual',
      ledger_entry_id TEXT REFERENCES ledger_entries(id)
    );

    CREATE TABLE IF NOT EXISTS cash_categories (
      codigo TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      es_ingreso INTEGER NOT NULL,
      orden INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS expense_templates (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      dia_vencimiento INTEGER,
      monto_referencia REAL,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expense_payments (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES expense_templates(id),
      anio INTEGER NOT NULL,
      mes INTEGER NOT NULL,
      fecha_pago TEXT NOT NULL,
      monto REAL NOT NULL,
      registrado_por TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(template_id, anio, mes)
    );

    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'operador',
      telefono TEXT,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_client ON client_invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);
  `);

  const catCount = sqliteDb.prepare("SELECT COUNT(*) AS n FROM cash_categories").get();
  if (!catCount?.n) {
    const ins = sqliteDb.prepare(
      "INSERT INTO cash_categories (codigo, nombre, es_ingreso, orden) VALUES (?, ?, ?, ?)"
    );
    const cats = [
      ["venta_credito", "Venta a credito (fiado)", 1, 10],
      ["venta_efectivo", "Venta efectivo", 1, 20],
      ["venta_tarjeta", "Venta tarjeta", 1, 30],
      ["venta_transferencia", "Venta transferencia", 1, 40],
      ["cobranza_cc", "Cobranza cuenta corriente", 1, 50],
      ["gasto_combustible", "Combustible", 0, 100],
      ["gasto_comida", "Comida / viaticos", 0, 110],
      ["gasto_ute", "UTE", 0, 120],
      ["gasto_otro", "Otro gasto", 0, 199],
    ];
    for (const c of cats) ins.run(...c);
  }

  const expCount = sqliteDb.prepare("SELECT COUNT(*) AS n FROM expense_templates").get();
  if (!expCount?.n) {
    const ins = sqliteDb.prepare(
      "INSERT INTO expense_templates (id, nombre, dia_vencimiento) VALUES (?, ?, ?)"
    );
    for (const [nombre, dia] of [["UTE", 10], ["OSE", 15], ["Antel", 20], ["Alquiler", 5]]) {
      ins.run(crypto.randomUUID(), nombre, dia);
    }
  }
}

export async function initDb() {
  if (isPostgres()) {
    pgPool = new pg.Pool(buildPgConfig());
    try {
      await pgPool.query("SELECT 1");
    } catch (err) {
      if (err.code === "28P01") {
        throw new Error(
          "Password de Postgres incorrecta (28P01). " +
          "Usa la Database password del proyecto (no la de tu cuenta Supabase). " +
          "Si tiene simbolos ($, @, #), usa SUPABASE_DB_PASSWORD entre comillas en .env " +
          "o codifica la URI ($ -> %24). Reset: Supabase > Settings > Database > Reset database password."
        );
      }
      throw err;
    }
    console.log("PostgreSQL conectado (Supabase)");
    return;
  }
  initSqlite();
}

export async function all(sql, params = []) {
  if (isPostgres()) {
    const res = await pgPool.query(toPgPlaceholders(sql), params);
    return res.rows;
  }
  return sqliteDb.prepare(sql).all(...params);
}

export async function get(sql, params = []) {
  if (isPostgres()) {
    const res = await pgPool.query(toPgPlaceholders(sql), params);
    return res.rows[0] ?? null;
  }
  const row = sqliteDb.prepare(sql).get(...params);
  return row ?? null;
}

export async function run(sql, params = []) {
  if (isPostgres()) {
    const res = await pgPool.query(toPgPlaceholders(sql), params);
    return { changes: res.rowCount ?? 0 };
  }
  return sqliteDb.prepare(sql).run(...params);
}

export async function closeDb() {
  if (pgPool) await pgPool.end();
  if (sqliteDb) sqliteDb.close();
}
