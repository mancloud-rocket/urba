import crypto from "crypto";
import { getAppUserById } from "../services/queries.js";

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function verifyHs256(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [header, payload, sig] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
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

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!verifyHs256(token, secret)) {
    return res.status(401).json({ error: "Token invalido" });
  }

  const payload = decodeJwtPayload(token);
  if (!payload?.sub) {
    return res.status(401).json({ error: "Token invalido" });
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    return res.status(401).json({ error: "Token expirado" });
  }

  let appUser = await getAppUserById(payload.sub);
  if (!appUser) {
    appUser = {
      id: payload.sub,
      nombre: payload.email || "Usuario",
      rol: "operador",
    };
  }

  req.user = appUser;
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
