import { useEffect } from "react";
import Icon from "./Icon";

export default function Modal({ open, onClose, title, description, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade">
      <div
        className="absolute inset-0"
        style={{ background: "rgb(var(--rgb-text-primary) / 0.15)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-labelledby="modal-title"
        className="relative w-full sm:max-w-md panel-elevated rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto animate-rise"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
          <div>
            <h2 id="modal-title" className="text-h1 text-text-primary">
              {title}
            </h2>
            {description && <p className="text-caption text-text-tertiary mt-1">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost h-7 w-7 p-0 -mr-1 shrink-0 rounded-lg"
            aria-label="Cerrar"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div
            className="px-6 pb-6 pt-2 flex items-center justify-end gap-2"
            style={{ borderTop: "1px solid rgb(var(--rgb-border-subtle) / 0.06)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
