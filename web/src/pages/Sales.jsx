import { useEffect, useState } from "react";
import { api, fmt } from "../lib/api";
import Modal from "../components/Modal";
import { PageHeader, KPI, Tag, Spinner, EmptyState, Field } from "../components/primitives";
import Icon from "../components/Icon";

const PAGO_TONE = {
  pagado: "positive",
  pendiente: "warning",
  parcial: "accent",
  otro: "default",
};

export default function Sales() {
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState({ supplier_id: "", estado_pago: "" });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "", producto: "", usd_venta: "", usd_costo: "", estado_pago: "pendiente",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.suppliers().then(setSuppliers).catch(console.error);
    api.salesStats().then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filter.supplier_id) params.supplier_id = filter.supplier_id;
    if (filter.estado_pago) params.estado_pago = filter.estado_pago;
    api.sales(params)
      .then(setSales)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createSale({
        ...form,
        usd_venta: +form.usd_venta,
        usd_costo: +form.usd_costo || 0,
      });
      setModal(false);
      api.salesStats().then(setStats);
      setFilter({ ...filter });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo · proveedores"
        title="Ventas"
        description="Líneas por marca, margen, IVA y estado de cobro."
        actions={
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Icon name="plus" size={13} />
            Nueva línea
          </button>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-5 stagger">
          <KPI label="Venta total" value={fmt(stats.total_venta, "USD")} />
          <KPI label="Costo" value={fmt(stats.total_costo, "USD")} />
          <KPI label="Margen" value={fmt(stats.total_margen, "USD")} accent />
          <KPI label="Líneas" value={stats.total_lineas} hint="registradas" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <select
          className="input sm:w-56"
          value={filter.supplier_id}
          onChange={(e) => setFilter({ ...filter, supplier_id: e.target.value })}
        >
          <option value="">Todos los proveedores</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
        <select
          className="input sm:w-48"
          value={filter.estado_pago}
          onChange={(e) => setFilter({ ...filter, estado_pago: e.target.value })}
        >
          <option value="">Cualquier estado</option>
          <option value="pagado">Pagado</option>
          <option value="pendiente">Pendiente</option>
          <option value="parcial">Parcial</option>
        </select>
      </div>

      <section className="panel overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size={18} />
          </div>
        ) : sales.length === 0 ? (
          <EmptyState title="Sin líneas" description="Sin ventas para los filtros seleccionados." />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Producto</th>
                  <th>Cliente</th>
                  <th className="text-right">Venta</th>
                  <th className="text-right">Margen</th>
                  <th>Pago</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td className="text-caption text-text-tertiary">{s.proveedor_nombre}</td>
                    <td className="font-medium text-text-primary max-w-[220px] truncate">{s.producto}</td>
                    <td className="text-caption text-text-tertiary">{s.cliente_nombre || "—"}</td>
                    <td className="text-right money text-text-primary">{fmt(s.usd_venta, "USD")}</td>
                    <td className="text-right money text-positive">
                      {fmt((s.usd_venta || 0) - (s.usd_costo || 0), "USD")}
                    </td>
                    <td>
                      <Tag tone={PAGO_TONE[s.estado_pago] || "default"}>{s.estado_pago}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Nueva venta"
        description="Una línea por producto."
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" form="sale-form" className="btn-primary" disabled={saving}>
              {saving ? <Spinner size={12} /> : <Icon name="check" size={13} />}
              Registrar
            </button>
          </>
        }
      >
        <form id="sale-form" onSubmit={handleCreate} className="space-y-4">
          <Field label="Proveedor">
            <select
              className="input"
              required
              value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
            >
              <option value="">Seleccionar...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Producto">
            <input
              className="input"
              required
              value={form.producto}
              onChange={(e) => setForm({ ...form, producto: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="USD venta">
              <input
                type="number"
                className="input mono"
                required
                value={form.usd_venta}
                onChange={(e) => setForm({ ...form, usd_venta: e.target.value })}
              />
            </Field>
            <Field label="USD costo">
              <input
                type="number"
                className="input mono"
                value={form.usd_costo}
                onChange={(e) => setForm({ ...form, usd_costo: e.target.value })}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
