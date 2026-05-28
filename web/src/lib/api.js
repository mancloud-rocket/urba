const BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  dashboard: () => request("/api/dashboard"),
  clients: () => request("/api/clients"),
  client: (codigo) => request(`/api/clients/${codigo}`),
  createClient: (data) => request("/api/clients", { method: "POST", body: JSON.stringify(data) }),
  createLedger: (data) => request("/api/ledger", { method: "POST", body: JSON.stringify(data) }),
  aging: () => request("/api/aging"),
  suppliers: () => request("/api/suppliers"),
  sales: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/sales${q ? `?${q}` : ""}`);
  },
  salesStats: () => request("/api/sales/stats"),
  createSale: (data) => request("/api/sales", { method: "POST", body: JSON.stringify(data) }),
  chat: (message) => request("/api/chat", { method: "POST", body: JSON.stringify({ message }) }),
  phones: () => request("/api/config/phones"),
};

export function fmt(n, currency = "UYU") {
  if (n == null || Number.isNaN(n)) return "—";
  const opts = currency === "USD"
    ? { style: "currency", currency: "USD", maximumFractionDigits: 0 }
    : { style: "currency", currency: "UYU", maximumFractionDigits: 0 };
  return new Intl.NumberFormat("es-UY", opts).format(n);
}

export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-UY", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
