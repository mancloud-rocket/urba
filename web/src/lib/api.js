const BASE = import.meta.env.VITE_API_URL || "";

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
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
  createInvoice: (data) => request("/api/invoices", { method: "POST", body: JSON.stringify(data) }),
  notificationPreview: (params) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/notifications/preview?${q}`);
  },
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
  cashToday: () => request("/api/cash/today"),
  cashCategories: () => request("/api/cash/categories"),
  addCashLine: (data) => request("/api/cash/lines", { method: "POST", body: JSON.stringify(data) }),
  closeCash: (data) => request("/api/cash/close", { method: "POST", body: JSON.stringify(data) }),
  cashHistory: (month) => request(`/api/cash/history?month=${month}`),
  expenseTemplates: () => request("/api/expenses/templates"),
  createExpenseTemplate: (data) =>
    request("/api/expenses/templates", { method: "POST", body: JSON.stringify(data) }),
  registerExpensePayment: (data) =>
    request("/api/expenses/payments", { method: "POST", body: JSON.stringify(data) }),
  expenseAlerts: () => request("/api/expenses/alerts"),
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
