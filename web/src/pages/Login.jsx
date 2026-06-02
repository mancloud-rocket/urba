import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Field } from "../components/primitives";
import Icon from "../components/Icon";
import { LogoMark } from "../components/Logo";

export default function Login() {
  const { signIn, isConfigured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isConfigured) {
    navigate("/", { replace: true });
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-base">
      <div className="panel w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <LogoMark size={40} />
          <h1 className="text-h1 text-text-primary">URBA</h1>
          <p className="text-caption text-text-tertiary text-center">Cuenta corriente Solymar</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Contrasena">
            <input
              type="password"
              className="input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          {error && <p className="text-caption text-negative">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            <Icon name="check" size={14} />
            {loading ? "Entrando..." : "Iniciar sesion"}
          </button>
        </form>
      </div>
    </div>
  );
}
