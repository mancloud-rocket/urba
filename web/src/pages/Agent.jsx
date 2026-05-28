import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { PageHeader, Spinner, Kbd } from "../components/primitives";
import { LogoMark } from "../components/Logo";
import Icon from "../components/Icon";

const SUGGESTIONS = [
  { icon: "users", text: "¿Cuánto debe Andrés?" },
  { icon: "users", text: "Datos de Franco del Bove" },
  { icon: "trending", text: "¿Quién está vencido?" },
  { icon: "panel", text: "¿Quiénes deben plata?" },
];

function TypingDots() {
  return (
    <div
      className="inline-flex items-center gap-1 px-3 py-2.5 rounded-lg"
      style={{ background: "rgb(var(--rgb-border-subtle) / 0.04)" }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-text-tertiary animate-pulse-dot"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </div>
  );
}

export default function Agent() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Soy el agente URBA. Consulto deudas, vencimientos y preparo cargos o cobros — con confirmación explícita en cada escritura.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await api.chat(text);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Error de conexión con el servidor." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        eyebrow="IA · disponible en WhatsApp"
        title="Agente URBA"
        description="Mismo motor que tu número de WhatsApp interno. Probá acá antes de conectarlo."
      />

      <section className="panel flex flex-col h-[min(70vh,560px)] overflow-hidden">
        {/* Agent header */}
        <header
          className="flex items-center gap-3 px-5 h-14"
          style={{
            borderBottom: "1px solid rgb(var(--rgb-border-subtle) / 0.06)",
            background: "rgb(255 255 255 / 0.5)",
          }}
        >
          <div className="relative">
            <LogoMark size={28} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-positive border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body text-text-primary font-medium">URBA Agent</p>
            <p className="text-caption text-text-tertiary">
              Escrituras requieren responder <Kbd>SI</Kbd>
            </p>
          </div>
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost h-8"
            title="Abrir WhatsApp"
          >
            <Icon name="whatsapp" size={15} />
          </a>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-6 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex animate-slide-in-right ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 text-body leading-relaxed rounded-xl ${
                  m.role === "user"
                    ? "bg-accent text-white rounded-br-sm font-medium"
                    : "text-text-primary rounded-bl-sm"
                }`}
                style={
                  m.role === "assistant"
                    ? {
                        background: "rgb(255 255 255 / 0.9)",
                        boxShadow: "0 0 0 1px rgb(var(--rgb-border-subtle) / 0.06)",
                      }
                    : undefined
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-fade">
              <TypingDots />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <footer
          className="px-3 py-3 space-y-2.5"
          style={{
            borderTop: "1px solid rgb(var(--rgb-border-subtle) / 0.06)",
            background: "rgb(255 255 255 / 0.45)",
          }}
        >
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.text}
                type="button"
                onClick={() => send(s.text)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-caption text-text-tertiary hover:text-text-primary transition-colors"
                style={{
                  background: "rgb(255 255 255 / 0.7)",
                  boxShadow: "0 0 0 1px rgb(var(--rgb-border-subtle) / 0.06)",
                }}
              >
                <Icon name={s.icon} size={11} />
                {s.text}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              className="input input-lg flex-1"
              placeholder="Escribí tu consulta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              className="btn-primary btn-lg px-4"
              disabled={loading || !input.trim()}
            >
              {loading ? <Spinner size={13} /> : <Icon name="send" size={14} />}
            </button>
          </form>
        </footer>
      </section>

      <p className="text-caption text-text-quaternary text-center mt-6 leading-relaxed max-w-sm mx-auto">
        Para WhatsApp interno: configurar <span className="mono text-text-tertiary">WHATSAPP_ACCESS_TOKEN</span> y <span className="mono text-text-tertiary">ALLOWED_PHONES</span> en el servidor.
      </p>
    </div>
  );
}
