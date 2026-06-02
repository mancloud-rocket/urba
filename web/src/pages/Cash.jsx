import { useCallback, useEffect, useState } from "react";
import { api, fmt } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useRealtimeRefetch } from "../context/RealtimeProvider";
import { REALTIME_TABLES } from "../lib/supabase";
import Modal from "../components/Modal";
import { Field, Spinner, Tag } from "../components/primitives";
import Icon from "../components/Icon";

export default function Cash() {
  const { profile } = useAuth();
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ categoria: "gasto_combustible", monto: "", referencia: "", es_ingreso: false });
  const [saving, setSaving] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [history, setHistory] = useState([]);

  const load = useCallback(() => {
    api.cashToday().then(setData).catch(console.error);
    api.cashCategories().then(setCategories).catch(console.error);
    api.cashHistory(historyMonth).then(setHistory).catch(console.error);
  }, [historyMonth]);

  useEffect(() => { load(); }, [load]);
  useRealtimeRefetch(load, REALTIME_TABLES.cash);

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={20} />
      </div>
    );
  }

  const { closure, lines, totales } = data;
  const closed = closure.estado === "cerrado";
  const canEdit = profile?.rol === "admin" || profile?.rol === "cajero";

  async function addLine(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addCashLine({
        categoria: form.categoria,
        monto: +form.monto,
        referencia: form.referencia,
        es_ingreso: form.es_ingreso,
      });
      setModal(false);
      setForm({ categoria: "gasto_combustible", monto: "", referencia: "", es_ingreso: false });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function closeDay() {
    if (!confirm("¿Cerrar la caja del dia?")) return;
    try {
      await api.closeCash({ fecha: closure.fecha });
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Operaciones</p>
          <h1 className="text-display text-text-primary">Caja del dia</h1>
          <p className="text-caption text-text-tertiary mt-1">{closure.fecha}</p>
        </div>
        <Tag tone={closed ? "neutral" : "positive"}>{closed ? "Cerrado" : "Borrador"}</Tag>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="panel p-4">
          <p className="eyebrow">Ingresos</p>
          <p className="money text-h2 text-positive mt-1">{fmt(totales.ingresos)}</p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Egresos</p>
          <p className="money text-h2 text-negative mt-1">{fmt(totales.egresos)}</p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Neto</p>
          <p className="money text-h2 text-text-primary mt-1">{fmt(totales.neto)}</p>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgb(var(--rgb-border-subtle) / 0.06)" }}>
          <h2 className="text-h2">Lineas del dia</h2>
          {canEdit && !closed && (
            <button type="button" className="btn-secondary" onClick={() => setModal(true)}>
              <Icon name="plus" size={13} />
              Agregar gasto
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Referencia</th>
                <th>Origen</th>
                <th className="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.categoria_nombre || l.categoria}</td>
                  <td className="text-caption text-text-tertiary">{l.referencia || "—"}</td>
                  <td><Tag tone="neutral">{l.origen}</Tag></td>
                  <td className={`text-right money ${l.es_ingreso ? "text-positive" : "text-negative"}`}>
                    {l.es_ingreso ? "+" : "-"}{fmt(l.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && !closed && (
          <div className="p-4 flex justify-end">
            <button type="button" className="btn-primary" onClick={closeDay}>
              Cerrar caja del dia
            </button>
          </div>
        )}
      </section>

      <section className="panel p-5 space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-h2">Historico mensual</h2>
          <input
            type="month"
            className="input w-auto"
            value={historyMonth}
            onChange={(e) => setHistoryMonth(e.target.value)}
          />
        </div>
        {history.length === 0 ? (
          <p className="text-caption text-text-tertiary">Sin cierres en este mes.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.categoria} className="flex justify-between text-caption">
                <span>{h.nombre || h.categoria}</span>
                <span className="money">{fmt(h.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={modal} onClose={() => setModal(false)} title="Agregar linea manual" footer={
        <>
          <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          <button type="submit" form="cash-line-form" className="btn-primary" disabled={saving}>Guardar</button>
        </>
      }>
        <form id="cash-line-form" onSubmit={addLine} className="space-y-4">
          <Field label="Categoria">
            <select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              {categories.filter((c) => !c.es_ingreso).map((c) => (
                <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Monto">
            <input type="number" className="input mono" required min="0.01" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
          </Field>
          <Field label="Referencia">
            <input className="input" value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
