import { v4 as uuid } from "uuid";
import { all, get, run, isPostgres } from "../db.js";
import { audit } from "./audit.js";

function ingresoVal(v) {
  return isPostgres() ? Boolean(v) : (v ? 1 : 0);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function contadoCategoria(medio) {
  const m = (medio || "efectivo").toLowerCase();
  if (m === "tarjeta") return "venta_tarjeta";
  if (m === "transferencia") return "venta_transferencia";
  return "venta_efectivo";
}

export async function getCashCategories() {
  return all("SELECT * FROM cash_categories ORDER BY orden");
}

export async function getClosureByDate(fecha) {
  return get("SELECT * FROM cash_closures WHERE fecha = ?", [fecha]);
}

export async function getClosureLines(closureId) {
  return all(`
    SELECT ccl.*, cc.nombre AS categoria_nombre
    FROM cash_closure_lines ccl
    LEFT JOIN cash_categories cc ON cc.codigo = ccl.categoria
    WHERE ccl.closure_id = ?
    ORDER BY ccl.es_ingreso DESC, ccl.categoria
  `, [closureId]);
}

export async function buildDailyDraft(fecha = todayStr()) {
  const entries = await all(`
    SELECT * FROM ledger_entries WHERE fecha = ?
  `, [fecha]);

  const draft = {};
  for (const e of entries) {
    let cat;
    let ingreso = true;
    if (e.tipo === "cargo") {
      cat = "venta_credito";
    } else if (e.tipo === "pago_contado") {
      cat = contadoCategoria(e.medio_pago);
    } else if (e.tipo === "abono") {
      cat = "cobranza_cc";
    } else {
      continue;
    }
    const key = `${cat}:${e.id}`;
    draft[key] = {
      categoria: cat,
      monto: Number(e.monto),
      es_ingreso: ingreso,
      referencia: e.referencia || e.observacion,
      origen: "auto_ledger",
      ledger_entry_id: e.id,
    };
  }
  return Object.values(draft);
}

export async function getCashToday(actor = "web") {
  const fecha = todayStr();
  let closure = await getClosureByDate(fecha);

  if (!closure) {
    const id = uuid();
    await run(`
      INSERT INTO cash_closures (id, fecha, cerrado_por, estado)
      VALUES (?, ?, ?, 'borrador')
    `, [id, fecha, actor]);
    closure = await get("SELECT * FROM cash_closures WHERE id = ?", [id]);

    const draft = await buildDailyDraft(fecha);
    for (const line of draft) {
      await run(`
        INSERT INTO cash_closure_lines (id, closure_id, categoria, monto, es_ingreso, referencia, origen, ledger_entry_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuid(), closure.id, line.categoria, line.monto,
        ingresoVal(line.es_ingreso), line.referencia, line.origen, line.ledger_entry_id,
      ]);
    }
  }

  const lines = await getClosureLines(closure.id);
  const ingresos = lines.filter((l) => l.es_ingreso).reduce((s, l) => s + Number(l.monto), 0);
  const egresos = lines.filter((l) => !l.es_ingreso).reduce((s, l) => s + Number(l.monto), 0);

  return {
    closure,
    lines,
    totales: { ingresos, egresos, neto: ingresos - egresos },
  };
}

export async function addCashLine(fecha, data, actor) {
  const closure = await getClosureByDate(fecha);
  if (!closure) throw new Error("No hay cierre para esa fecha");
  if (closure.estado === "cerrado") throw new Error("El dia ya esta cerrado");

  const id = uuid();
  await run(`
    INSERT INTO cash_closure_lines (id, closure_id, categoria, monto, es_ingreso, referencia, origen)
    VALUES (?, ?, ?, ?, ?, ?, 'manual')
  `, [
    id, closure.id, data.categoria, data.monto,
    ingresoVal(data.es_ingreso !== false), data.referencia || null,
  ]);
  await audit(actor, "cash_line_added", { fecha, categoria: data.categoria });
  return get("SELECT * FROM cash_closure_lines WHERE id = ?", [id]);
}

export async function closeCashDay(fecha, actor, notas) {
  const closure = await getClosureByDate(fecha);
  if (!closure) throw new Error("No hay cierre para esa fecha");
  if (closure.estado === "cerrado") throw new Error("El dia ya esta cerrado");

  await run(`
    UPDATE cash_closures SET estado = 'cerrado', cerrado_por = ?, notas = ? WHERE id = ?
  `, [actor, notas || null, closure.id]);
  await audit(actor, "cash_closed", { fecha });
  return get("SELECT * FROM cash_closures WHERE id = ?", [closure.id]);
}

export async function getCashHistory(month) {
  const [y, m] = month.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const endM = m === 12 ? 1 : m + 1;
  const endY = m === 12 ? y + 1 : y;
  const end = `${endY}-${String(endM).padStart(2, "0")}-01`;

  return all(`
    SELECT ccl.categoria, cc.nombre, cc.es_ingreso,
      SUM(ccl.monto) AS total
    FROM cash_closure_lines ccl
    JOIN cash_closures cc2 ON cc2.id = ccl.closure_id
    LEFT JOIN cash_categories cc ON cc.codigo = ccl.categoria
    WHERE cc2.fecha >= ? AND cc2.fecha < ? AND cc2.estado = 'cerrado'
    GROUP BY ccl.categoria, cc.nombre, cc.es_ingreso
    ORDER BY cc.es_ingreso DESC, total DESC
  `, [start, end]);
}
