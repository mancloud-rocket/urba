import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client = null;

export function isSupabaseConfigured() {
  return Boolean(url && key);
}

export function isRealtimeEnabled() {
  return isSupabaseConfigured();
}

export function getSupabase() {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url, key, {
      realtime: { params: { eventsPerSecond: 4 } },
    });
  }
  return client;
}

export const supabase = getSupabase();

export const REALTIME_TABLES = {
  dashboard: ["clients", "ledger_entries", "sales_lines", "cash_closures"],
  clients: ["clients", "ledger_entries"],
  clientDetail: ["clients", "ledger_entries", "client_invoices"],
  sales: ["sales_lines", "suppliers"],
  cash: ["cash_closures", "cash_closure_lines"],
  expenses: ["expense_templates", "expense_payments"],
};
