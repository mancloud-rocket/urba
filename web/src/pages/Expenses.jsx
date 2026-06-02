import { useCallback, useEffect, useState } from "react";
import { api, fmt } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useRealtimeRefetch } from "../context/RealtimeProvider";
import { REALTIME_TABLES } from "../lib/supabase";
import { Tag, Spinner } from "../components/primitives";
import Icon from "../components/Icon";

export default function Expenses() {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [paying, setPaying] = useState(null);

  const load = useCallback(() => {
    api.expenseTemplates().then(setTemplates).catch(console.error);
    api.expenseAlerts().then(setAlerts).catch(console.error);
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeRefetch(load, REALTIME_TABLES.expenses);

  const canPay = profile?.rol === "admin" || profile?.rol === "cajero";

  async function markPaid(t) {
    const monto = prompt(`Monto pagado ${t.nombre}:`, t.monto_referencia || "");
    if (!monto) return;
    setPaying(t.id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.registerExpensePayment({
        template_id: t.id,
        fecha_pago: today,
        monto: +monto,
      });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setPaying(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Administracion</p>
        <h1 className="text-display text-text-primary">Gastos fijos</h1>
      </div>

      {alerts.length > 0 && (
        <section className="panel p-5 border-l-4" style={{ borderColor: "rgb(var(--rgb-negative))" }}>
          <p className="eyebrow text-negative">Alertas</p>
          <ul className="mt-2 space-y-2">
            {alerts.map((a) => (
              <li key={a.template_id} className="text-caption text-text-primary">{a.mensaje}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgb(var(--rgb-border-subtle) / 0.06)" }}>
          <h2 className="text-h2">Servicios recurrentes</h2>
        </div>
        {!templates.length ? (
          <div className="p-8 flex justify-center"><Spinner size={20} /></div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "rgb(var(--rgb-border-subtle) / 0.06)" }}>
            {templates.map((t) => {
              const alert = alerts.find((a) => a.template_id === t.id);
              return (
                <li key={t.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">{t.nombre}</p>
                    <p className="text-caption text-text-tertiary">
                      Vence dia {t.dia_vencimiento}
                      {t.monto_referencia ? ` · ref ${fmt(t.monto_referencia)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert ? <Tag tone="warning">Pendiente</Tag> : <Tag tone="positive">Al dia</Tag>}
                    {canPay && alert && (
                      <button type="button" className="btn-secondary" disabled={paying === t.id} onClick={() => markPaid(t)}>
                        <Icon name="check" size={13} />
                        Marcar pagado
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
