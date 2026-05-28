import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmt } from "../lib/api";
import Modal from "../components/Modal";
import { PageHeader, Tag, Spinner, EmptyState, Field } from "../components/primitives";
import Icon from "../components/Icon";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ codigo: "", nombre: "", telefono: "", plazo_dias: 7, barrio: "" });
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.clients()
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.codigo.toLowerCase().includes(q) ||
        c.nombre.toLowerCase().includes(q) ||
        (c.telefono || "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  const totalCartera = filtered.reduce((s, c) => s + Math.max(0, c.saldo), 0);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createClient(form);
      setModal(false);
      setForm({ codigo: "", nombre: "", telefono: "", plazo_dias: 7, barrio: "" });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={`${filtered.length} de ${clients.length} clientes`}
        title="Clientes"
        description={`Cartera filtrada: ${fmt(totalCartera)}`}
        actions={
          <button type="button" className="btn-primary" onClick={() => setModal(true)}>
            <Icon name="plus" size={13} />
            Nuevo cliente
          </button>
        }
      />

      <div className="mb-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Icon
            name="search"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="search"
            placeholder="Buscar por código, nombre o teléfono..."
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={20} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "Sin resultados" : "Sin clientes"}
          description={search ? "Probá con otro término." : "Cargá tu primer cliente para arrancar."}
        />
      ) : (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table interactive">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Código</th>
                  <th>Nombre</th>
                  <th>Barrio</th>
                  <th className="text-right">Plazo</th>
                  <th className="text-right">Saldo</th>
                  <th style={{ width: 24 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => (window.location.href = `/clientes/${c.codigo}`)}
                  >
                    <td>
                      <span className="mono text-caption text-text-tertiary">{c.codigo}</span>
                    </td>
                    <td className="font-medium text-text-primary">{c.nombre}</td>
                    <td className="text-text-tertiary text-caption">{c.barrio || "—"}</td>
                    <td className="text-right text-caption text-text-tertiary">{c.plazo_dias}d</td>
                    <td className="text-right money font-medium" style={{
                      color: c.saldo > 0 ? "var(--accent)" : "var(--text-tertiary)",
                    }}>
                      {fmt(c.saldo)}
                    </td>
                    <td>
                      <Icon name="arrowRight" size={12} className="text-text-quaternary" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Nuevo cliente"
        description="Datos mínimos para empezar a operar."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button type="submit" form="new-client" className="btn-primary" disabled={saving}>
              {saving ? <Spinner size={12} /> : <Icon name="check" size={13} />}
              Crear
            </button>
          </>
        }
      >
        <form id="new-client" onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código">
              <input
                className="input mono"
                required
                placeholder="C99"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              />
            </Field>
            <Field label="Plazo (días)">
              <input
                type="number"
                className="input mono"
                value={form.plazo_dias}
                onChange={(e) => setForm({ ...form, plazo_dias: +e.target.value })}
              />
            </Field>
          </div>
          <Field label="Nombre">
            <input
              className="input"
              required
              placeholder="Juan Pérez"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono">
              <input
                className="input mono"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </Field>
            <Field label="Barrio">
              <input
                className="input"
                value={form.barrio}
                onChange={(e) => setForm({ ...form, barrio: e.target.value })}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
