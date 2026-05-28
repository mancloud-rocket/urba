import "dotenv/config";
import express from "express";
import cors from "cors";
import api from "./routes/api.js";
import { initDb, isPostgres, driver } from "./db.js";
import { seedDatabase } from "./seed.js";

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, product: "URBA", version: "1.0.0", db: driver });
});

app.use("/api", api);

async function start() {
  try {
    await initDb();
    await seedDatabase();
  } catch (err) {
    console.error("Error al iniciar base de datos:", err.message);
    if (isPostgres()) {
      console.error("Verifica DATABASE_URL y que ejecutaste supabase/schema.sql");
    }
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`URBA API en http://localhost:${PORT} (${driver})`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Puerto ${PORT} en uso. Cerra la otra instancia o usa PORT=8788 en .env`);
      process.exit(1);
    }
    throw err;
  });
}

start();
