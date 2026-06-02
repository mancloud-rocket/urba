import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmt, fmtDate } from "../lib/api";
import { REALTIME_TABLES } from "../lib/supabase";
import { useRealtimeRefetch } from "../context/RealtimeProvider";
import { useAuth } from "../context/AuthContext";
import { PageHeader, KPI, Tag, Spinner, EmptyState, Divider } from "../components/primitives";
import Icon from "../components/Icon";
import { ledgerLabel } from "../lib/ledger-labels";

export default function Dashboard() {
  const { profile, session, loading: authLoading, isConfigured } = useAuth();
  const isAdmin = profile?.rol === "admin";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(({ silent } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    return api.dashboard()
      .then(setData)
      .catch((err) => {
        console.error(err);
        setData(null);
        setError(err.message || "Error al cargar el panel");
      })
      .finally(() => { if (!silent) setLoading(false); });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (isConfigured && !session) return;
    load();
  }, [load, authLoading, session, isConfigured]);
  useRealtimeRefetch(load, REALTIME_TABLES.dashboard);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size={20} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        title="No se pudo cargar el panel"
        description={error || "Sin datos"}
      />
    );
  }

  const { aging, sales, clientCount, recentEntries, expenseAlerts = [] } = data;
  const buckets = isAdmin ? [
    { key: "mas_de_3", label: "+3 dias", value: aging.buckets?.mas_de_3 || 0, tone: "positive" },
    { key: "de_1_a_3", label: "1-3 dias", value: aging.buckets?.de_1_a_3 || 0, tone: "info" },
    { key: "vence_hoy", label: "Vence hoy", value: aging.buckets?.vence_hoy || 0, tone: "warning" },
    { key: "vencido", label: "Vencido", value: aging.buckets?.vencido || 0, tone: "critical" },
  ] : [];

  const totalAging = buckets.reduce((s, b) => s + b.value, 0) || 1;

  return (
    <div>
      <PageHeader
        eyebrow="Panel · hoy"
        title="Control de cuentas"
        description="Cartera, vencimientos y ventas. Datos en vivo desde tu base."
        actions={
          <>
            <Link to="/clientes" className="btn-secondary">
              <Icon name="users" size={14} />
              Clientes
            </Link>
            <Link to="/agente" className="btn-primary">
              <Icon name="spark" size={14} />
              Preguntar al agente
            </Link>
          </>
        }
      />

      {expenseAlerts.length > 0 && (
        <section className="panel p-4 mb-4 border-l-4" style={{ borderColor: "rgb(var(--rgb-warning))" }}>
          <p className="eyebrow text-warning">Gastos fijos pendientes</p>
          <ul className="mt-2 space-y-1 text-caption">
            {expenseAlerts.map((a) => (
              <li key={a.template_id}>{a.mensaje}</li>
            ))}
          </ul>
          <Link to="/gastos" className="btn-secondary mt-3 inline-flex">Ver gastos fijos</Link>
        </section>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 stagger">
        {isAdmin ? (
          <>
            <KPI label="Cartera" value={fmt(aging.total_cartera)} hint={`${clientCount} clientes activos`} accent />
            <KPI label="Vencido" value={fmt(aging.total_vencido)} hint="Gestion prioritaria" />
            <KPI
              label="Ventas USD"
              value={fmt(sales.total_venta, "USD")}
              hint={sales.total_margen != null ? `Margen ${fmt(sales.total_margen, "USD")}` : ""}
            />
            <KPI label="Por cobrar" value={fmt(sales.pendiente_cobro, "USD")} hint={`${sales.total_lineas} lineas`} />
          </>
        ) : (
          <>
            <KPI label="Clientes activos" value={String(clientCount)} hint="Vista operador" />
            <KPI label="Ventas USD" value={fmt(sales?.total_venta, "USD")} hint={`${sales?.total_lineas || 0} lineas`} />
            <KPI label="Por cobrar" value={fmt(sales?.pendiente_cobro, "USD")} hint="USD pendiente" />
          </>
        )}
      </section>

      {isAdmin && (
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="panel p-6 lg:col-span-3">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <p className="eyebrow mb-1">Aging</p>
              <h2 className="text-h1 text-text-primary">Distribución por vencimiento</h2>
            </div>
            <span className="text-caption text-text-quaternary">
              {fmt(aging.total_cartera)} cartera · {aging.fecha_actual}
            </span>
          </div>

          {/* Stacked bar */}
          <div className="flex h-2 rounded-full overflow-hidden bg-elevated">
            {buckets.map((b) => (
              <div
                key={b.key}
                className="h-full transition-all duration-700 ease-out"
                style={{
                  width: `${(b.value / totalAging) * 100}%`,
                  background:
                    b.tone === "positive"
                      ? "var(--positive)"
                      : b.tone === "info"
                      ? "var(--info)"
                      : b.tone === "warning"
                      ? "var(--warning)"
                      : "var(--critical)",
                }}
                title={`${b.label}: ${fmt(b.value)}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 stagger">
            {buckets.map((b) => (
              <div key={b.key} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background:
                        b.tone === "positive"
                          ? "var(--positive)"
                          : b.tone === "info"
                          ? "var(--info)"
                          : b.tone === "warning"
                          ? "var(--warning)"
                          : "var(--critical)",
                    }}
                  />
                  <p className="text-caption text-text-tertiary">{b.label}</p>
                </div>
                <p className="money text-h1 text-text-primary">{fmt(b.value)}</p>
                <p className="text-caption text-text-quaternary">
                  {((b.value / totalAging) * 100).toFixed(0)}% del total
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Critical list */}
        <div className="panel p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="eyebrow mb-1">Atención</p>
              <h2 className="text-h1 text-text-primary">Vencidos</h2>
            </div>
            <Tag tone="critical">{aging.vencidos.length}</Tag>
          </div>

          {aging.vencidos.length === 0 ? (
            <div className="py-6 text-center">
              <div className="mx-auto w-8 h-8 rounded-full bg-positive/15 border border-positive/30 flex items-center justify-center mb-2">
                <Icon name="check" size={14} className="text-positive" />
              </div>
              <p className="text-body text-text-primary">Sin vencidos</p>
              <p className="text-caption text-text-tertiary">Cartera al día.</p>
            </div>
          ) : (
            <ul className="space-y-3 stagger">
              {aging.vencidos.slice(0, 5).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link
                        to={`/clientes/${v.codigo}`}
                        className="text-body text-text-primary font-medium truncate hover:text-accent transition-colors"
                      >
                        {v.nombre}
                      </Link>
                      <span className="mono text-caption text-text-quaternary">{v.codigo}</span>
                    </div>
                    <p className="text-caption text-critical">
                      {Math.abs(v.dias)} días vencido
                    </p>
                  </div>
                  <p className="money text-body text-text-primary shrink-0">
                    {fmt(v.monto_aplicado)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      )}

      {/* Recent activity */}
      <section className="panel overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgb(var(--rgb-border-subtle) / 0.06)" }}
        >
          <div>
            <p className="eyebrow">Actividad</p>
            <h2 className="text-h2 text-text-primary mt-0.5">Movimientos recientes</h2>
          </div>
          <Link
            to="/clientes"
            className="text-caption font-medium text-text-tertiary hover:text-accent transition-colors inline-flex items-center gap-1"
          >
            Ver todos
            <Icon name="arrowRight" size={11} />
          </Link>
        </div>

        {recentEntries.length === 0 ? (
          <EmptyState
            title="Sin movimientos"
            description="Cuando registres cargos o cobros aparecerán acá."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((e) => (
                  <tr key={e.id}>
                    <td className="text-text-tertiary text-caption whitespace-nowrap">
                      {fmtDate(e.fecha)}
                    </td>
                    <td>
                      <Link
                        to={`/clientes/${e.codigo}`}
                        className="font-medium text-text-primary hover:text-accent transition-colors"
                      >
                        {e.nombre}
                      </Link>
                      <span className="ml-2 mono text-caption text-text-quaternary">
                        {e.codigo}
                      </span>
                    </td>
                    <td>
                      <Tag tone={e.tipo === "cargo" ? "warning" : "positive"}>
                        {ledgerLabel(e.tipo)}
                      </Tag>
                    </td>
                    <td className="text-right money text-text-primary">{fmt(e.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
