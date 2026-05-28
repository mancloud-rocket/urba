import Icon from "./Icon";

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div className="space-y-1.5">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-h1 sm:text-display text-text-primary">{title}</h1>
        {description && (
          <p className="text-body text-text-tertiary max-w-xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function KPI({ label, value, delta, hint, sparkline, accent = false }) {
  return (
    <div
      className={`panel p-5 lift relative overflow-hidden ${accent ? "" : ""}`}
      style={
        accent
          ? { boxShadow: "0 0 0 1px rgb(var(--rgb-accent) / 0.2), 0 4px 16px rgb(var(--rgb-accent) / 0.08)" }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {delta != null && (
          <span
            className={`text-caption font-medium inline-flex items-center gap-0.5 ${
              delta >= 0 ? "text-positive" : "text-critical"
            }`}
          >
            <Icon name={delta >= 0 ? "arrowUp" : "arrowDown"} size={12} />
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className={`money text-[28px] leading-9 mt-3 ${accent ? "text-accent" : "text-text-primary"}`}>
        {value}
      </p>
      {hint && <p className="text-caption text-text-quaternary mt-1">{hint}</p>}
      {sparkline}
    </div>
  );
}

export function Tag({ tone = "default", children }) {
  const map = {
    default: "tag",
    accent: "tag-accent",
    positive: "tag-positive",
    warning: "tag-warning",
    critical: "tag-critical",
    info: "tag",
  };
  return <span className={map[tone]}>{children}</span>;
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <p className="text-caption text-text-quaternary mt-1">{hint}</p>}
    </label>
  );
}

export function Spinner({ size = 16 }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className="inline-block animate-spin rounded-full border-text-quaternary/30 border-t-accent"
      style={{ width: size, height: size, borderWidth: "1.5px" }}
    />
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="panel py-14 px-6 text-center">
      <div
        className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: "rgb(var(--rgb-border-subtle) / 0.04)" }}
      >
        <Icon name="receipt" size={18} className="text-text-tertiary" />
      </div>
      <p className="text-h2 text-text-primary">{title}</p>
      {description && (
        <p className="text-body text-text-tertiary mt-1 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Divider({ className = "" }) {
  return (
    <div
      className={`h-px ${className}`}
      style={{ background: "rgb(var(--rgb-border-subtle) / 0.06)" }}
    />
  );
}

export function Kbd({ children }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-mono text-text-quaternary"
      style={{
        background: "rgb(255 255 255 / 0.7)",
        boxShadow: "0 0 0 1px rgb(var(--rgb-border-subtle) / 0.1)",
      }}
    >
      {children}
    </kbd>
  );
}
