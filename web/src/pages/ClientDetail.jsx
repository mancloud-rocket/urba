import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, fmt, fmtDate } from "../lib/api";
import { REALTIME_TABLES } from "../lib/supabase";
import { useRealtimeRefetch } from "../context/RealtimeProvider";
import Modal from "../components/Modal";
import { Tag, Spinner, EmptyState, Field } from "../components/primitives";
import Icon from "../components/Icon";
import { ledgerLabel, ledgerTone } from "../lib/ledger-labels";

const EMPTY_LINE = { descripcion: "", cantidad: 1, precio_unitario: "" };

export default function ClientDetail() {
  const { codigo } = useParams();
  const [client, setClient] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    monto: "",
    referencia: "",
    observacion: "",
    medio_pago: "efectivo",
    enviar_whatsapp: false,
    es_generica: false,
    lines: [{ ...EMPTY_LINE }],
  });
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => api.client(codigo).then(setClient).catch(console.error), [codigo]);
  useEffect(() => { load(); }, [load]);
  useRealtimeRefetch(load, REALTIME_TABLES.clientDetail);

  useEffect(() => {
    if (!form.enviar_whatsapp || !client) {
      setPreview("");
      return;
    }
    const tipo = modal === "abono" ? "cobranza" : "factura";
    const monto = modal === "factura_detalle"
      ? invoiceTotal(form.lines, form.es_generica, form.monto)
      : +form.monto;
    if (!monto || monto <= 0) return;
    api.notificationPreview({ cliente_codigo: codigo, tipo, monto, referencia: form.referencia })
      .then((r) => setPreview(r.preview || ""))
      .catch(() => setPreview(""));
  }, [form.enviar_whatsapp, form.monto, form.referencia, form.lines, form.es_generica, modal, client, codigo]);

  if (!client) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={20} />
      </div>
    );
  }

  function invoiceTotal(lines, esGenerica, montoGenerico) {
    if (esGenerica) return Number(montoGenerico) || 0;
    return lines.reduce((s, l) => s + (Number(l.cantidad) || 1) * (Number(l.precio_unitario) || 0), 0);
  }

  async function submitLedger(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const tipo = modal === "abono" ? "abono" : modal === "contado" ? "pago_contado" : "cargo";
      await api.createLedger({
        cliente_codigo: codigo,
        tipo,
        monto: +form.monto,
        referencia: form.referencia,
        observacion: form.observacion,
        medio_pago: modal === "abono" || modal === "contado" ? form.medio_pago : undefined,
        enviar_whatsapp: form.enviar_whatsapp,
      });
      closeModal();
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitInvoice(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        cliente_codigo: codigo,
        es_generica: form.es_generica,
        referencia: form.referencia,
        observacion: form.observacion,
        enviar_whatsapp: form.enviar_whatsapp,
      };
      if (form.es_generica) {
        payload.monto = +form.monto;
      } else {
        payload.lines = form.lines.map((l) => ({
          descripcion: l.descripcion,
          cantidad: Number(l.cantidad) || 1,
          precio_unitario: Number(l.precio_unitario) || 0,
        }));
      }
      await api.createInvoice(payload);
      closeModal();
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setModal(null);
    setForm({
      monto: "",
      referencia: "",
      observacion: "",
      medio_pago: "efectivo",
      enviar_whatsapp: false,
      es_generica: false,
      lines: [{ ...EMPTY_LINE }],
    });
    setPreview("");
  }

  const modalTitles = {
    cargo: "Registrar factura (fiado)",
    abono: "Registrar cobranza",
    contado: "Registrar pago contado",
    factura_detalle: "Factura con detalle",
  };

  return (
    <div>
      <Link
        to="/clientes"
        className="inline-flex items-center gap-1 text-caption text-text-tertiary hover:text-text-primary transition-colors mb-6"
      >
        <Icon name="arrowLeft" size={12} />
        Clientes
      </Link>

      <section className="panel p-6 lg:p-8 mb-4 relative overflow-hidden beam">
        <div className="relative z-[1] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="mono text-caption text-text-tertiary">{client.codigo}</span>
              {client.activo && <Tag tone="positive">Activo</Tag>}
            </div>
            <h1 className="text-display text-text-primary">{client.nombre}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-text-tertiary">
              {client.telefono && <span className="mono">{client.telefono}</span>}
              {client.barrio && <span>{client.barrio}</span>}
              <span>Plazo {client.plazo_dias}d</span>
            </div>
          </div>
          <div className="lg:text-right">
            <p className="eyebrow mb-1">Saldo cuenta corriente</p>
            <p
              className="money font-semibold text-display leading-none"
              style={{ color: client.saldo > 0 ? "var(--accent)" : "var(--positive)" }}
            >
              {fmt(client.saldo)}
            </p>
          </div>
        </div>

        <div className="relative z-[1] flex flex-wrap gap-2 mt-7 pt-6" style={{ borderTop: "1px solid rgb(var(--rgb-border-subtle) / 0.06)" }}>
          <button type="button" className="btn-primary" onClick={() => setModal("cargo")}>
            <Icon name="plus" size={13} />
            Factura
          </button>
          <button type="button" className="btn-primary" onClick={() => setModal("factura_detalle")}>
            Factura con items
          </button>
          <button type="button" className="btn-secondary" onClick={() => setModal("abono")}>
            <Icon name="check" size={13} />
            Cobranza
          </button>
          <button type="button" className="btn-secondary" onClick={() => setModal("contado")}>
            Pago contado
          </button>
          {client.telefono && (
            <a
              href={`https://wa.me/${client.telefono.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost ml-auto"
            >
              <Icon name="whatsapp" size={14} />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}
        </div>
      </section>

      <LedgerTable title="Cuenta corriente" rows={client.ledger} empty="Sin movimientos en cuenta corriente." />

      {(client.contado?.length > 0) && (
        <div className="mt-4">
          <LedgerTable title="Pagos al contado" rows={client.contado} empty="" />
        </div>
      )}

      {client.invoices?.length > 0 && (
        <section className="panel overflow-hidden mt-4">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgb(var(--rgb-border-subtle) / 0.06)" }}>
            <h2 className="text-h2">Facturas con detalle</h2>
          </div>
          <ul className="p-5 space-y-4">
            {client.invoices.map((inv) => (
              <li key={inv.id} className="text-caption">
                <p className="font-medium text-text-primary">
                  {fmtDate(inv.fecha)}
                  {inv.es_generica ? " · Mercaderias varias" : ""}
                </p>
                <ul className="mt-1 text-text-tertiary space-y-0.5">
                  {inv.lines?.map((l) => (
                    <li key={l.id}>{l.descripcion} — {fmt(l.subtotal)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modalTitles[modal] || ""}
        description={
          modal === "contado"
            ? "No afecta el saldo de cuenta corriente."
            : modal === "abono"
              ? "Resta deuda con un cobro recibido."
              : "Suma deuda al cliente (fiado)."
        }
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
            <button
              type="submit"
              form={modal === "factura_detalle" ? "invoice-form" : "ledger-form"}
              className="btn-primary"
              disabled={saving}
            >
              {saving ? <Spinner size={12} /> : <Icon name="check" size={13} />}
              Confirmar
            </button>
          </>
        }
      >
        {modal === "factura_detalle" ? (
          <form id="invoice-form" onSubmit={submitInvoice} className="space-y-4">
            <label className="flex items-center gap-2 text-caption">
              <input
                type="checkbox"
                checked={form.es_generica}
                onChange={(e) => setForm({ ...form, es_generica: e.target.checked })}
              />
              Mercaderias varias
            </label>
            {form.es_generica ? (
              <Field label="Monto total">
                <input type="number" className="input mono" required min="0.01" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
              </Field>
            ) : (
              <div className="space-y-3">
                {form.lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <input className="input" placeholder="Descripcion" required value={line.descripcion} onChange={(e) => {
                        const lines = [...form.lines];
                        lines[i] = { ...line, descripcion: e.target.value };
                        setForm({ ...form, lines });
                      }} />
                    </div>
                    <div className="col-span-2">
                      <input type="number" className="input mono" min="0.01" step="0.01" placeholder="Cant" value={line.cantidad} onChange={(e) => {
                        const lines = [...form.lines];
                        lines[i] = { ...line, cantidad: e.target.value };
                        setForm({ ...form, lines });
                      }} />
                    </div>
                    <div className="col-span-3">
                      <input type="number" className="input mono" required min="0" step="0.01" placeholder="Precio" value={line.precio_unitario} onChange={(e) => {
                        const lines = [...form.lines];
                        lines[i] = { ...line, precio_unitario: e.target.value };
                        setForm({ ...form, lines });
                      }} />
                    </div>
                    <div className="col-span-2">
                      <button type="button" className="btn-ghost w-full" onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })} disabled={form.lines.length <= 1}>×</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-secondary text-caption" onClick={() => setForm({ ...form, lines: [...form.lines, { ...EMPTY_LINE }] })}>
                  + Linea
                </button>
                <p className="text-caption text-text-tertiary">
                  Total: {fmt(invoiceTotal(form.lines, false, 0))}
                </p>
              </div>
            )}
            <Field label="Referencia">
              <input className="input" value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} />
            </Field>
            <WhatsAppFields form={form} setForm={setForm} preview={preview} hasPhone={!!client.telefono} />
          </form>
        ) : (
          <form id="ledger-form" onSubmit={submitLedger} className="space-y-4">
            <Field label="Monto">
              <input type="number" className="input input-lg mono" required min="0.01" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
            </Field>
            <Field label="Referencia" hint="Remito, factura u observacion corta">
              <input className="input" value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} />
            </Field>
            {(modal === "abono" || modal === "contado") && (
              <Field label="Medio de pago">
                <select className="input" value={form.medio_pago} onChange={(e) => setForm({ ...form, medio_pago: e.target.value })}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cheque">Cheque</option>
                </select>
              </Field>
            )}
            <Field label="Observacion">
              <input className="input" value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} />
            </Field>
            <WhatsAppFields form={form} setForm={setForm} preview={preview} hasPhone={!!client.telefono} />
          </form>
        )}
      </Modal>
    </div>
  );
}

function WhatsAppFields({ form, setForm, preview, hasPhone }) {
  if (!hasPhone) {
    return <p className="text-caption text-text-tertiary">Cliente sin telefono: no se puede enviar aviso WhatsApp.</p>;
  }
  return (
    <>
      <label className="flex items-center gap-2 text-caption">
        <input
          type="checkbox"
          checked={form.enviar_whatsapp}
          onChange={(e) => setForm({ ...form, enviar_whatsapp: e.target.checked })}
        />
        Enviar aviso por WhatsApp al cliente
      </label>
      {form.enviar_whatsapp && preview && (
        <div className="p-3 rounded-lg text-caption text-text-secondary" style={{ background: "rgb(var(--rgb-border-subtle) / 0.04)" }}>
          <p className="eyebrow mb-1">Vista previa</p>
          {preview}
        </div>
      )}
    </>
  );
}

function LedgerTable({ title, rows, empty }) {
  return (
    <section className="panel overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgb(var(--rgb-border-subtle) / 0.06)" }}>
        <div>
          <p className="eyebrow">Libro</p>
          <h2 className="text-h2 text-text-primary mt-0.5">{title}</h2>
        </div>
        <span className="text-caption text-text-quaternary">{rows?.length || 0} registros</span>
      </div>
      {!rows?.length ? (
        <EmptyState title="Sin movimientos" description={empty} />
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
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="text-text-tertiary text-caption whitespace-nowrap">{fmtDate(e.fecha)}</td>
                  <td className="mono text-caption text-text-tertiary">{e.referencia || "—"}</td>
                  <td>
                    <Tag tone={ledgerTone(e.tipo)}>{ledgerLabel(e.tipo)}</Tag>
                  </td>
                  <td className="text-caption text-text-tertiary whitespace-nowrap">{fmtDate(e.fecha_vencimiento)}</td>
                  <td className="text-right money font-medium text-text-primary">{fmt(e.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
