import jwt from "jsonwebtoken";
import { getAppUserById } from "../services/queries.js";

function verifySupabaseJwt(token, secret) {
  const trimmed = (secret || "").trim();
  if (!trimmed) return null;
  try {
    return jwt.verify(token, trimmed, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

export function authDisabled() {
  return process.env.AUTH_DISABLED === "true" || !process.env.SUPABASE_JWT_SECRET;
}

export async function authMiddleware(req, res, next) {
  if (authDisabled()) {
    req.user = { id: "dev", rol: "admin", nombre: "Desarrollo" };
    return next();
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const payload = verifySupabaseJwt(token, process.env.SUPABASE_JWT_SECRET);
  if (!payload?.sub) {
    return res.status(401).json({
      error: "Token invalido. En Render usa SUPABASE_JWT_SECRET (JWT Secret de Supabase API), no la anon key.",
    });
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    return res.status(401).json({ error: "Token expirado" });
  }

  const row = await getAppUserById(payload.sub);
  req.user = {
    id: payload.sub,
    nombre: row?.nombre || payload.email || "Usuario",
    rol: row?.rol || "operador",
    email: payload.email,
  };
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (authDisabled()) return next();
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: "Sin permiso" });
    }
    next();
  };
}
