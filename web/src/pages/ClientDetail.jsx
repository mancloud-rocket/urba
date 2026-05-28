import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, fmt, fmtDate } from "../lib/api";
import Modal from "../components/Modal";
import { Tag, Spinner, EmptyState, Field } from "../components/primitives";
import Icon from "../components/Icon";

export default function ClientDetail() {
  const { codigo } = useParams();
  const [client, setClient] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ monto: "", referencia: "", observacion: "", medio_pago: "efectivo" });
  const [saving, setSaving] = useState(false);

  const load = () => api.client(codigo).then(setClient).catch(console.error);
  useEffect(() => { load(); }, [codigo]);

  if (!client) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={20} />
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createLedger({
        cliente_codigo: codigo,
        tipo: modal,
        monto: +form.monto,
        referencia: form.referencia,
        observacion: form.observacion,
        medio_pago: modal === "abono" ? form.medio_pago : undefined,
      });
      setModal(null);
      setForm({ monto: "", referencia: "", observacion: "", medio_pago: "efectivo" });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link
        to="/clientes"
        className="inline-flex items-center gap-1 text-caption text-text-tertiary hover:text-text-primary transition-colors mb-6"
      >
        <Icon name="arrowLeft" size={12} />
        Clientes
      </Link>

      {/* Hero */}
      <section className="panel p-6 lg:p-8 mb-4 relative overflow-hidden beam">
        <div className="relative z-[1] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="mono text-caption text-text-tertiary">{client.codigo}</span>
              {client.activo && <Tag tone="positive">Activo</Tag>}
            </div>
            <h1 className="text-display text-text-primary">{client.nombre}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-text-tertiary">
              {client.telefono && (
                <span className="mono">{client.telefono}</span>
              )}
              {client.barrio && <span>{client.barrio}</span>}
              {client.email && <span>{client.email}</span>}
              <span>Plazo {client.plazo_dias}d</span>
            </div>
          </div>
          <div className="lg:text-right">
            <p className="eyebrow mb-1">Saldo actual</p>
            <p
              className="money font-semibold text-display leading-none"
              style={{ color: client.saldo > 0 ? "var(--accent)" : "var(--positive)" }}
            >
              {fmt(client.saldo)}
            </p>
          </div>
        </div>

        <div className="relative z-[1] flex flex-wrap gap-2 mt-7 pt-6" style={{ borderTop: "1px solid rgb(var(--rgb-border-subtle) / 0.06)" }}>
          <button className="btn-primary" onClick={() => setModal("cargo")}>
            <Icon name="plus" size={13} />
            Registrar cargo
          </button>
          <button className="btn-secondary" onClick={() => setModal("abono")}>
            <Icon name="check" size={13} />
            Registrar abono
          </button>
          <a
            href={`https://wa.me/${(client.telefono || "").replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost ml-auto"
          >
            <Icon name="whatsapp" size={14} />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>
      </section>

      {/* Ledger */}
      <section className="panel overflow-hidden">
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgb(var(--rgb-border-subtle) / 0.06)" }}
        >
          <div>
            <p className="eyebrow">Libro</p>
            <h2 className="text-h2 text-text-primary mt-0.5">Movimientos</h2>
          </div>
          <span className="text-caption text-text-quaternary">{client.ledger.length} registros</span>
        </div>

        {client.ledger.length === 0 ? (
          <EmptyState
            title="Sin movimientos"
            description="Registrá el primer cargo o abono para este cliente."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Referencia</th>
                  <th>Tipo</th>
                  <th>Vence</th>
                  <th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {client.ledger.map((e) => (
                  <tr key={e.id}>
                    <td className="text-text-tertiary text-caption whitespace-nowrap">
                      {fmtDate(e.fecha)}
                    </td>
                    <td className="mono text-caption text-text-tertiary">
                      {e.referencia || "—"}
                    </td>
                    <td>
                      <Tag tone={e.tipo === "cargo" ? "warning" : "positive"}>
                        {e.tipo}
                      </Tag>
                    </td>
                    <td className="text-caption text-text-tertiary whitespace-nowrap">
                      {fmtDate(e.fecha_vencimiento)}
                    </td>
                    <td className="text-right money font-medium text-text-primary">
                      {fmt(e.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === "cargo" ? "Registrar cargo" : "Registrar abono"}
        description={modal === "cargo"
          ? "Suma deuda al cliente (fiado)."
          : "Resta deuda con un cobro recibido."}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button
              type="submit"
              form="ledger-form"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? <Spinner size={12} /> : <Icon name="check" size={13} />}
              Confirmar
            </button>
          </>
        }
      >
        <form id="ledger-form" onSubmit={submit} className="space-y-4">
          <Field label="Monto">
            <input
              type="number"
              className="input input-lg mono"
              required
              min="0.01"
              step="0.01"
              placeholder="0"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
            />
          </Field>
          <Field label="Referencia" hint="Número de remito, factura u observación corta">
            <input
              className="input"
              value={form.referencia}
              onChange={(e) => setForm({ ...form, referencia: e.target.value })}
            />
          </Field>
          {modal === "abono" && (
            <Field label="Medio de pago">
              <select
                className="input"
                value={form.medio_pago}
                onChange={(e) => setForm({ ...form, medio_pago: e.target.value })}
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="cheque">Cheque</option>
              </select>
            </Field>
          )}
          <Field label="Observación">
            <input
              className="input"
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
