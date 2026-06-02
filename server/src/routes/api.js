import express from "express";
import {
  getClientBalances,
  getClientDetail,
  getAgingSummary,
  getSuppliers,
  getSales,
  getSalesStats,
  getDashboardStats,
  getAllowedPhones,
} from "../services/queries.js";
import {
  createClient,
  createLedgerEntry,
  createSaleLine,
} from "../services/mutations.js";
import { createInvoice, getClientInvoices } from "../services/invoices.js";
import { previewNotification } from "../services/client-notification.js";
import {
  getCashToday,
  addCashLine,
  closeCashDay,
  getCashHistory,
  getCashCategories,
} from "../services/cash.js";
import {
  getExpenseTemplates,
  createExpenseTemplate,
  registerExpensePayment,
  getExpenseAlerts,
} from "../services/expenses.js";
import { processAgentMessage } from "../services/openai-agent.js";
import {
  handleWhatsAppWebhookGet,
  handleWhatsAppWebhookPost,
} from "../services/whatsapp-webhook.js";
import { verifyWhatsAppCredentials } from "../services/whatsapp.js";
import { log, truncate, maskPhone } from "../services/logger.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { getClientByCodigo } from "../services/queries.js";

const router = express.Router();

router.use((req, res, next) => {
  if (req.path.startsWith("/whatsapp")) return next();
  if (req.path === "/internal/expenses/check" && req.headers["x-cron-secret"] === process.env.CRON_SECRET) {
    return next();
  }
  return authMiddleware(req, res, next);
});

router.get("/dashboard", async (req, res) => {
  res.json(await getDashboardStats(req.user?.rol || "admin"));
});

router.get("/clients", async (_req, res) => {
  res.json(await getClientBalances());
});

router.get("/clients/:codigo", async (req, res) => {
  const detail = await getClientDetail(req.params.codigo);
  if (!detail) return res.status(404).json({ error: "No encontrado" });
  res.json(detail);
});

router.get("/clients/:codigo/invoices", async (req, res) => {
  const c = await getClientByCodigo(req.params.codigo);
  if (!c) return res.status(404).json({ error: "No encontrado" });
  res.json(await getClientInvoices(c.id));
});

router.post("/clients", async (req, res) => {
  try {
    const actor = req.user?.nombre || "web";
    res.status(201).json(await createClient(req.body, actor));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/ledger", async (req, res) => {
  try {
    const actor = req.user?.nombre || "web";
    res.status(201).json(await createLedgerEntry(req.body, actor));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/invoices", async (req, res) => {
  try {
    const actor = req.user?.nombre || "web";
    res.status(201).json(await createInvoice(req.body, actor));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/notifications/preview", async (req, res) => {
  try {
    res.json(await previewNotification(req.query));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/aging", requireRole("admin"), async (_req, res) => {
  res.json(await getAgingSummary());
});

router.get("/suppliers", async (_req, res) => {
  res.json(await getSuppliers());
});

router.get("/sales", async (req, res) => {
  const rows = await getSales({
    supplierId: req.query.supplier_id,
    clientId: req.query.client_id,
    estadoPago: req.query.estado_pago,
  });
  if (req.user?.rol !== "admin") {
    return res.json(rows.map(({ usd_costo, ...rest }) => rest));
  }
  res.json(rows);
});

router.get("/sales/stats", async (req, res) => {
  res.json(await getSalesStats(req.user?.rol || "admin"));
});

router.post("/sales", async (req, res) => {
  try {
    const actor = req.user?.nombre || "web";
    res.status(201).json(await createSaleLine(req.body, actor));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/cash/today", requireRole("admin", "cajero"), async (req, res) => {
  res.json(await getCashToday(req.user?.nombre || "web"));
});

router.get("/cash/categories", requireRole("admin", "cajero"), async (_req, res) => {
  res.json(await getCashCategories());
});

router.post("/cash/lines", requireRole("admin", "cajero"), async (req, res) => {
  try {
    const fecha = req.body.fecha || new Date().toISOString().slice(0, 10);
    res.status(201).json(await addCashLine(fecha, req.body, req.user?.nombre || "web"));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/cash/close", requireRole("admin", "cajero"), async (req, res) => {
  try {
    const fecha = req.body.fecha || new Date().toISOString().slice(0, 10);
    res.json(await closeCashDay(fecha, req.user?.nombre || "web", req.body.notas));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/cash/history", requireRole("admin", "cajero"), async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  res.json(await getCashHistory(month));
});

router.get("/expenses/templates", requireRole("admin", "cajero"), async (_req, res) => {
  res.json(await getExpenseTemplates());
});

router.post("/expenses/templates", requireRole("admin"), async (req, res) => {
  try {
    res.status(201).json(await createExpenseTemplate(req.body, req.user?.nombre || "web"));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/expenses/payments", requireRole("admin", "cajero"), async (req, res) => {
  try {
    res.status(201).json(await registerExpensePayment(req.body, req.user?.nombre || "web"));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/expenses/alerts", async (req, res) => {
  if (req.user?.rol === "operador") return res.json([]);
  res.json(await getExpenseAlerts());
});

router.get("/internal/expenses/check", async (_req, res) => {
  res.json({ alerts: await getExpenseAlerts() });
});

router.get("/config/phones", requireRole("admin"), async (_req, res) => {
  res.json(await getAllowedPhones());
});

router.post("/chat", async (req, res) => {
  const { message, telefono = "web-demo" } = req.body;
  if (!message) return res.status(400).json({ error: "message requerido" });

  log.info("agent", "chat.request", {
    channel: "web",
    telefono: maskPhone(telefono),
    input_preview: truncate(message, 200),
  });

  const started = Date.now();
  try {
    const reply = await processAgentMessage(telefono, message, {
      channel: "web",
      userRol: req.user?.rol || "admin",
    });
    log.info("agent", "chat.response", {
      channel: "web",
      telefono: maskPhone(telefono),
      duration_ms: Date.now() - started,
      reply_preview: truncate(reply, 200),
    });
    res.json({ reply });
  } catch (e) {
    log.error("agent", "chat.error", {
      channel: "web",
      telefono: maskPhone(telefono),
      error: e.message,
      duration_ms: Date.now() - started,
    });
    res.status(500).json({ error: "Error interno del agente" });
  }
});

router.get("/whatsapp/webhook", handleWhatsAppWebhookGet);
router.post("/whatsapp/webhook", handleWhatsAppWebhookPost);

router.get("/whatsapp/diagnostic", async (_req, res) => {
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  const waCheck = await verifyWhatsAppCredentials();

  res.json({
    ok: waCheck.ok,
    note: "ok=true si Evolution esta conectada (state=open)",
    webhook_path: "/api/whatsapp/webhook",
    webhook_url: renderUrl ? `${renderUrl}/api/whatsapp/webhook` : null,
    evolution_url_set: Boolean(process.env.EVOLUTION_API_URL),
    evolution_key_set: Boolean(process.env.EVOLUTION_API_KEY),
    evolution_instance_set: Boolean(process.env.EVOLUTION_INSTANCE),
    openai_set: Boolean(process.env.OPENAI_API_KEY),
    auth_disabled: process.env.AUTH_DISABLED === "true" || !process.env.SUPABASE_JWT_SECRET,
    evolution: waCheck,
  });
});

export default router;
