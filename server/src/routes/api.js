import express from "express";
import {
  getClientBalances,
  getClientByCodigo,
  getClientLedger,
  getAgingSummary,
  getSuppliers,
  getSales,
  getSalesStats,
  getDashboardStats,
  getAllowedPhones,
  isPhoneAllowed,
} from "../services/queries.js";
import {
  createClient,
  createLedgerEntry,
  createSaleLine,
} from "../services/mutations.js";
import { processAgentMessage } from "../services/openai-agent.js";
import {
  handleWhatsAppWebhookVerify,
  handleWhatsAppWebhookPost,
} from "../services/whatsapp-webhook.js";
import { log, truncate, maskPhone } from "../services/logger.js";

const router = express.Router();

router.get("/dashboard", async (_req, res) => {
  res.json(await getDashboardStats());
});

router.get("/clients", async (_req, res) => {
  res.json(await getClientBalances());
});

router.get("/clients/:codigo", async (req, res) => {
  const c = await getClientByCodigo(req.params.codigo);
  if (!c) return res.status(404).json({ error: "No encontrado" });
  const balances = await getClientBalances();
  const balance = balances.find((b) => b.id === c.id);
  const ledger = await getClientLedger(c.id);
  res.json({ ...c, saldo: balance?.saldo || 0, ledger });
});

router.post("/clients", async (req, res) => {
  try {
    res.status(201).json(await createClient(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/ledger", async (req, res) => {
  try {
    res.status(201).json(await createLedgerEntry(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/aging", async (_req, res) => {
  res.json(await getAgingSummary());
});

router.get("/suppliers", async (_req, res) => {
  res.json(await getSuppliers());
});

router.get("/sales", async (req, res) => {
  res.json(await getSales({
    supplierId: req.query.supplier_id,
    clientId: req.query.client_id,
    estadoPago: req.query.estado_pago,
  }));
});

router.get("/sales/stats", async (_req, res) => {
  res.json(await getSalesStats());
});

router.post("/sales", async (req, res) => {
  try {
    res.status(201).json(await createSaleLine(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/config/phones", async (_req, res) => {
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
    const reply = await processAgentMessage(telefono, message, { channel: "web" });
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

router.get("/whatsapp/webhook", handleWhatsAppWebhookVerify);

router.post("/whatsapp/webhook", handleWhatsAppWebhookPost);

export default router;
