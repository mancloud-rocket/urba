import "dotenv/config";
import express from "express";
import cors from "cors";
import api from "./routes/api.js";
import { initDb, isPostgres, driver } from "./db.js";
import { seedDatabase } from "./seed.js";
import { log } from "./services/logger.js";
import { corsOptions } from "./lib/cors-config.js";

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  const url = req.originalUrl || req.url;
  const isWa = url.includes("whatsapp");
  const isChat = url.includes("/chat");

  if (isWa || isChat) {
    log.info("http", "request.incoming", {
      method: req.method,
      url,
      ip: req.ip,
      user_agent: req.get("user-agent")?.slice(0, 80),
    });
  }

  const started = Date.now();
  res.on("finish", () => {
    if (isWa || isChat) {
      log.info("http", "request.done", {
        method: req.method,
        url,
        status: res.statusCode,
        duration_ms: Date.now() - started,
      });
    }
  });
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, product: "URBA", version: "1.0.0", db: driver });
});

app.use("/api", api);

app.use((err, _req, res, _next) => {
  log.error("http", "unhandled_error", { error: err.message });
  if (!res.headersSent) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

async function start() {
  try {
    await initDb();
    await seedDatabase();
  } catch (err) {
    log.error("system", "db.init_failed", {
      error: err.message,
      postgres: isPostgres(),
    });
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    const renderUrl = process.env.RENDER_EXTERNAL_URL;
    log.info("system", "server.started", {
      port: PORT,
      db: driver,
      node_env: process.env.NODE_ENV || "development",
      log_level: process.env.LOG_LEVEL || "info",
      whatsapp_configured: Boolean(
        process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE
      ),
      openai_configured: Boolean(process.env.OPENAI_API_KEY),
      render_url: renderUrl || null,
      webhook_url: renderUrl ? `${renderUrl}/api/whatsapp/webhook` : null,
      health_url: renderUrl ? `${renderUrl}/health` : null,
    });
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      log.error("system", "server.port_in_use", { port: PORT });
      process.exit(1);
    }
    throw err;
  });
}

start();
