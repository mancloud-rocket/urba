import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client = null;

export function isRealtimeEnabled() {
  return Boolean(url && key);
}

export function getSupabase() {
  if (!isRealtimeEnabled()) return null;
  if (!client) {
    client = createClient(url, key, {
      realtime: { params: { eventsPerSecond: 4 } },
    });
  }
  return client;
}

export const REALTIME_TABLES = {
  dashboard: ["clients", "ledger_entries", "sales_lines"],
  clients: ["clients", "ledger_entries"],
  clientDetail: ["clients", "ledger_entries"],
  sales: ["sales_lines", "suppliers"],
};
