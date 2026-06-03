const DEFAULT_ORIGINS = [
  "https://urba-sage.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function parseExtraOrigins() {
  const raw = process.env.CORS_ORIGINS || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const extras = parseExtraOrigins();
  if (DEFAULT_ORIGINS.includes(origin)) return true;
  if (extras.includes(origin)) return true;
  if (origin.endsWith(".vercel.app")) return true;
  if (process.env.NODE_ENV !== "production" && origin.startsWith("http://localhost")) {
    return true;
  }
  return false;
}

export const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, origin || true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400,
};
