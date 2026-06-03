import jwt from "jsonwebtoken";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getAppUserById } from "../services/queries.js";

function supabaseUrl() {
  const raw = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  return raw.replace(/\/$/, "");
}

function decodeJwtPart(token, index) {
  try {
    const part = token.split(".")[index];
    if (!part) return null;
    const json = Buffer.from(part, "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function verifyLegacyHs256(token, secret) {
  const trimmed = (secret || "").trim();
  if (!trimmed) return null;
  try {
    return jwt.verify(token, trimmed, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

let jwksCache = null;

function getJwks() {
  const base = supabaseUrl();
  if (!base) return null;
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
  }
  return jwksCache;
}

async function verifyJwks(token) {
  const base = supabaseUrl();
  const jwks = getJwks();
  if (!base || !jwks) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${base}/auth/v1`,
    });
    return payload;
  } catch {
    return null;
  }
}

async function verifyViaSupabaseApi(token) {
  const base = supabaseUrl();
  const anon = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (!base || !anon) return null;

  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
      },
    });
    if (!res.ok) return null;
    const user = await res.json();
    if (!user?.id) return null;
    return { sub: user.id, email: user.email };
  } catch {
    return null;
  }
}

async function resolveTokenPayload(token) {
  const legacy = verifyLegacyHs256(token, process.env.SUPABASE_JWT_SECRET);
  if (legacy?.sub) return legacy;

  const header = decodeJwtPart(token, 0);
  const alg = header?.alg;

  if (alg && alg !== "HS256") {
    const fromJwks = await verifyJwks(token);
    if (fromJwks?.sub) return fromJwks;
  }

  const fromApi = await verifyViaSupabaseApi(token);
  if (fromApi?.sub) return fromApi;

  if (!alg || alg === "HS256") {
    const fromJwks = await verifyJwks(token);
    if (fromJwks?.sub) return fromJwks;
  }

  return null;
}

export function authDisabled() {
  if (process.env.AUTH_DISABLED === "true") return true;
  const hasLegacy = Boolean(process.env.SUPABASE_JWT_SECRET?.trim());
  const hasJwks = Boolean(supabaseUrl());
  return !hasLegacy && !hasJwks;
}

export async function authMiddleware(req, res, next) {
  try {
    if (req.method === "OPTIONS") {
      return next();
    }

    if (authDisabled()) {
      req.user = { id: "dev", rol: "admin", nombre: "Desarrollo" };
      return next();
    }

    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const payload = await resolveTokenPayload(token);
    if (!payload?.sub) {
      return res.status(401).json({
        error:
          "Token invalido. En Render configura SUPABASE_URL + SUPABASE_ANON_KEY (recomendado) " +
          "o SUPABASE_JWT_SECRET (Legacy JWT Secret si el token es HS256).",
      });
    }

    if (payload.exp && Number(payload.exp) * 1000 < Date.now()) {
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
  } catch (err) {
    next(err);
  }
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
