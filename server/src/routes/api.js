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
  extractInboundText,
  inboundTypeLabel,
  sendWhatsApp,
} from "../services/whatsapp.js";

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
  const reply = await processAgentMessage(telefono, message);
  res.json({ reply });
});

router.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post("/whatsapp/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const msg = change?.value?.messages?.[0];
    if (!msg) return;

    const from = msg.from.replace(/\D/g, "");
    const text = extractInboundText(msg);

    if (!text) {
      if (await isPhoneAllowed(from)) {
        await sendWhatsApp(
          from,
          `URBA solo procesa mensajes de texto por ahora (recibi ${inboundTypeLabel(msg)}).`
        );
      }
      return;
    }

    if (!(await isPhoneAllowed(from))) {
      await sendWhatsApp(from, "Numero no autorizado en URBA.");
      return;
    }

    const reply = await processAgentMessage(from, text);
    const sent = await sendWhatsApp(from, reply);
    if (!sent.ok) {
      console.error("No se pudo enviar respuesta WA a", from, sent.error);
    }
  } catch (e) {
    console.error("WhatsApp webhook error:", e);
  }
});

export default router;
