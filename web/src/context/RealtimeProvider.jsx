import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getSupabase, isRealtimeEnabled } from "../lib/supabase";

const RealtimeContext = createContext("off");

const WATCHED_TABLES = ["clients", "ledger_entries", "sales_lines", "suppliers"];

export function RealtimeProvider({ children }) {
  const [status, setStatus] = useState(isRealtimeEnabled() ? "connecting" : "off");

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setStatus("off");
      return;
    }

    const channel = supabase.channel("urba-db");

    for (const table of WATCHED_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          window.dispatchEvent(
            new CustomEvent("urba:db-change", { detail: { table, payload } })
          );
        }
      );
    }

    channel.subscribe((state) => {
      if (state === "SUBSCRIBED") setStatus("live");
      else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") setStatus("error");
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={status}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeStatus() {
  return useContext(RealtimeContext);
}

export function useRealtimeRefetch(refetch, tables) {
  const ref = useRef(refetch);
  ref.current = refetch;

  useEffect(() => {
    if (!isRealtimeEnabled() || !tables?.length) return;

    let timer;
    const onChange = (event) => {
      if (!tables.includes(event.detail?.table)) return;
      clearTimeout(timer);
      timer = setTimeout(() => ref.current?.({ silent: true }), 350);
    };

    window.addEventListener("urba:db-change", onChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("urba:db-change", onChange);
    };
  }, [tables.join(",")]);
}
