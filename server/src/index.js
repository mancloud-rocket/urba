import "dotenv/config";
import express from "express";
import cors from "cors";
import api from "./routes/api.js";
import { initDb, isPostgres, driver } from "./db.js";
import { seedDatabase } from "./seed.js";
import { log } from "./services/logger.js";

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors({ origin: true }));
app.use(express.json());

app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    if (req.path.includes("whatsapp") || req.path.includes("/chat")) {
      log.info("http", "request", {
        method: req.method,
        path: req.path,
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
    log.info("system", "server.started", {
      port: PORT,
      db: driver,
      node_env: process.env.NODE_ENV || "development",
      log_level: process.env.LOG_LEVEL || "info",
      whatsapp_configured: Boolean(
        process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
      ),
      openai_configured: Boolean(process.env.OPENAI_API_KEY),
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
