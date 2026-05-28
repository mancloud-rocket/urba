import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useRealtimeStatus } from "../context/RealtimeProvider";
import { LogoMark } from "./Logo";
import Icon from "./Icon";
import { Kbd } from "./primitives";

const NAV = [
  { to: "/", label: "Panel", icon: "panel", end: true },
  { to: "/clientes", label: "Clientes", icon: "users" },
  { to: "/ventas", label: "Ventas", icon: "bag" },
  { to: "/agente", label: "Agente", icon: "agent" },
];

function Sidebar() {
  return (
    <aside className="hidden lg:flex w-[220px] shrink-0 flex-col glass rounded-2xl overflow-hidden">
      <div className="px-4 h-[52px] flex items-center">
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <LogoMark size={24} />
          <span
            className="font-sans font-semibold text-text-primary"
            style={{ letterSpacing: "-0.04em", fontSize: "15px" }}
          >
            URBA
          </span>
        </NavLink>
      </div>

      <nav className="px-2 pb-2 flex-1">
        <p className="px-2.5 pt-1 pb-2 text-[10px] uppercase tracking-[0.12em] font-medium text-text-quaternary">
          Workspace
        </p>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
          >
            <Icon name={n.icon} size={15} className="opacity-70" />
            <span className="flex-1">{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 mt-auto">
        <div
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl"
          style={{ background: "rgb(var(--rgb-border-subtle) / 0.03)" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "rgb(var(--rgb-accent) / 0.1)",
              boxShadow: "0 0 0 1px rgb(var(--rgb-accent) / 0.2)",
            }}
          >
            <span className="text-[10px] font-semibold text-accent">U</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-caption text-text-primary truncate font-medium">Urbano</p>
            <p className="text-[10px] text-text-quaternary truncate">Barraca · Solymar</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function LiveIndicator() {
  const status = useRealtimeStatus();
  if (status === "off") return null;

  const label =
    status === "live" ? "En vivo" :
    status === "connecting" ? "Conectando..." :
    "Sin sync";

  const color =
    status === "live" ? "rgb(var(--rgb-positive))" :
    status === "connecting" ? "rgb(var(--rgb-accent))" :
    "rgb(var(--rgb-text-quaternary))";

  return (
    <span
      className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-medium text-text-tertiary px-2 py-1 rounded-lg"
      style={{ background: "rgb(var(--rgb-border-subtle) / 0.04)" }}
      title="Supabase Realtime: el panel se actualiza cuando cambian los datos"
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: color,
          boxShadow: status === "live" ? `0 0 6px ${color}` : undefined,
        }}
      />
      {label}
    </span>
  );
}

function Topbar({ onOpenSearch }) {
  const location = useLocation();
  const current = NAV.find(
    (n) => n.to === location.pathname || (n.to !== "/" && location.pathname.startsWith(n.to))
  );

  return (
    <header className="sticky top-0 z-30 glass-nav px-4 lg:px-5 h-[52px] flex items-center gap-3 rounded-none lg:rounded-xl lg:mx-0 lg:mt-0">
      <div className="lg:hidden flex items-center gap-2">
        <LogoMark size={22} />
      </div>

      <nav className="hidden sm:flex items-center gap-1.5 text-caption text-text-tertiary">
        <span>URBA</span>
        <span className="text-text-quaternary">/</span>
        <span className="text-text-primary font-medium">{current?.label || "Panel"}</span>
      </nav>

      <div className="flex-1 max-w-sm mx-auto hidden md:block">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full h-8 px-3 rounded-lg flex items-center gap-2 text-text-quaternary text-caption transition-all hover:text-text-secondary"
          style={{
            background: "rgb(255 255 255 / 0.6)",
            boxShadow: "0 0 0 1px rgb(var(--rgb-border-subtle) / 0.07)",
          }}
        >
          <Icon name="search" size={14} />
          <span className="flex-1 text-left">Buscar cliente, codigo o monto</span>
          <span className="flex items-center gap-0.5 opacity-60">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <LiveIndicator />
        <button type="button" className="btn-ghost h-8 w-8 p-0 rounded-lg" aria-label="Notificaciones">
          <Icon name="bell" size={15} />
        </button>
        <NavLink to="/agente" className="btn-primary h-8 rounded-lg">
          <Icon name="spark" size={13} />
          <span className="hidden sm:inline">Agente</span>
        </NavLink>
      </div>
    </header>
  );
}

function MobileTabBar() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-nav pb-[env(safe-area-inset-bottom)]"
      style={{ borderTop: "1px solid rgb(var(--rgb-border-subtle) / 0.05)" }}
    >
      <div className="grid grid-cols-4">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-accent" : "text-text-tertiary"
              }`
            }
          >
            <Icon name={n.icon} size={18} />
            {n.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function SearchPalette({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 animate-fade">
      <div
        className="absolute inset-0"
        style={{ background: "rgb(var(--rgb-text-primary) / 0.12)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl panel-elevated overflow-hidden animate-rise">
        <div
          className="flex items-center gap-2 px-4 h-12"
          style={{ borderBottom: "1px solid rgb(var(--rgb-border-subtle) / 0.06)" }}
        >
          <Icon name="search" size={16} className="text-text-tertiary" />
          <input
            autoFocus
            placeholder="Buscar..."
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-quaternary outline-none text-body"
          />
          <Kbd>ESC</Kbd>
        </div>
        <div className="p-3 text-caption text-text-tertiary">
          <p className="px-2 py-1.5">Proximamente: navegacion rapida, comandos y atajos.</p>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row lg:gap-3 lg:p-3">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:min-h-[calc(100vh-24px)]">
        <Topbar onOpenSearch={() => setPaletteOpen(true)} />

        <main className="flex-1 overflow-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-8 py-6 lg:py-8 animate-rise">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileTabBar />
      <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
