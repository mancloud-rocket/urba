import { v4 as uuid } from "uuid";
import { all, get, run, D } from "../db.js";
import { audit } from "./audit.js";

export async function getExpenseTemplates() {
  return all(`SELECT * FROM expense_templates WHERE activo = ${D.activeTrue()} ORDER BY nombre`);
}

export async function createExpenseTemplate(data, actor) {
  const id = uuid();
  await run(`
    INSERT INTO expense_templates (id, nombre, dia_vencimiento, monto_referencia)
    VALUES (?, ?, ?, ?)
  `, [id, data.nombre, data.dia_vencimiento || null, data.monto_referencia || null]);
  await audit(actor, "expense_template_created", { id, nombre: data.nombre });
  return get("SELECT * FROM expense_templates WHERE id = ?", [id]);
}

export async function registerExpensePayment(data, actor) {
  const id = uuid();
  const now = new Date();
  const anio = data.anio || now.getFullYear();
  const mes = data.mes || now.getMonth() + 1;

  await run(`
    INSERT INTO expense_payments (id, template_id, anio, mes, fecha_pago, monto, registrado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, data.template_id, anio, mes, data.fecha_pago, data.monto, actor]);
  await audit(actor, "expense_payment", { id, template_id: data.template_id });
  return get("SELECT * FROM expense_payments WHERE id = ?", [id]);
}

export async function getExpenseAlerts() {
  const today = new Date();
  const anio = today.getFullYear();
  const mes = today.getMonth() + 1;
  const dia = today.getDate();

  const templates = await getExpenseTemplates();
  const alerts = [];

  for (const t of templates) {
    if (!t.dia_vencimiento || t.dia_vencimiento > dia) continue;

    const paid = await get(`
      SELECT 1 AS ok FROM expense_payments
      WHERE template_id = ? AND anio = ? AND mes = ?
    `, [t.id, anio, mes]);

    if (!paid) {
      alerts.push({
        template_id: t.id,
        nombre: t.nombre,
        dia_vencimiento: t.dia_vencimiento,
        mensaje: `${t.nombre}: vence el dia ${t.dia_vencimiento} y no hay pago registrado este mes`,
      });
    }
  }

  return alerts;
}
