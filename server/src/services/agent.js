import {
  getClientBalances,
  getClientByCodigo,
  searchClients,
  getClientLedger,
  getAgingSummary,
  getSuppliers,
  getSales,
  getDashboardStats,
} from "./queries.js";
import {
  savePendingConfirmation,
  consumePendingConfirmation,
  executeConfirmedAction,
} from "./mutations.js";

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "buscar_cliente",
      description: "Busca clientes por codigo, nombre o telefono",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "saldo_cliente",
      description: "Obtiene saldo y ultimos movimientos de un cliente por codigo",
      parameters: {
        type: "object",
        properties: {
          codigo: { type: "string" },
          limite: { type: "number" },
        },
        required: ["codigo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_vencidos",
      description: "Lista clientes con deuda vencida y resumen de aging",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "resumen_cartera",
      description: "Resumen general: total cartera, aging, ventas",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_ventas",
      description: "Busca lineas de venta por proveedor o estado de pago",
      parameters: {
        type: "object",
        properties: {
          proveedor: { type: "string" },
          estado_pago: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_cargo",
      description: "Prepara un cargo (fiado) pendiente de confirmacion del usuario",
      parameters: {
        type: "object",
        properties: {
          cliente_codigo: { type: "string" },
          monto: { type: "number" },
          referencia: { type: "string" },
          observacion: { type: "string" },
        },
        required: ["cliente_codigo", "monto"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_abono",
      description: "Prepara un abono (cobro) pendiente de confirmacion",
      parameters: {
        type: "object",
        properties: {
          cliente_codigo: { type: "string" },
          monto: { type: "number" },
          medio_pago: { type: "string", enum: ["efectivo", "transferencia", "tarjeta", "cheque", "otro"] },
          observacion: { type: "string" },
        },
        required: ["cliente_codigo", "monto"],
      },
    },
  },
];

export async function runTool(name, args, telefono) {
  switch (name) {
    case "buscar_cliente":
      return searchClients(args.query);
    case "saldo_cliente": {
      const c = await getClientByCodigo(args.codigo);
      if (!c) return { error: "Cliente no encontrado" };
      const balances = await getClientBalances();
      const bal = balances.find((b) => b.id === c.id);
      const movs = await getClientLedger(c.id, args.limite || 10);
      return { cliente: c, saldo: bal?.saldo || 0, movimientos: movs };
    }
    case "listar_vencidos":
      return getAgingSummary();
    case "resumen_cartera":
      return getDashboardStats();
    case "buscar_ventas": {
      const suppliers = await getSuppliers();
      const sup = args.proveedor
        ? suppliers.find((s) => s.nombre.toLowerCase().includes(args.proveedor.toLowerCase()))
        : null;
      return getSales({ supplierId: sup?.id, estadoPago: args.estado_pago });
    }
    case "preparar_cargo": {
      const c = await getClientByCodigo(args.cliente_codigo);
      if (!c) return { error: "Cliente no encontrado" };
      await savePendingConfirmation(telefono, "registrar_cargo", {
        cliente_codigo: args.cliente_codigo,
        monto: args.monto,
        referencia: args.referencia,
        observacion: args.observacion,
      });
      return {
        pendiente_confirmacion: true,
        mensaje: `Confirmar cargo $${args.monto} a ${c.nombre} (${c.codigo}). Responde SI para confirmar.`,
      };
    }
    case "preparar_abono": {
      const c = await getClientByCodigo(args.cliente_codigo);
      if (!c) return { error: "Cliente no encontrado" };
      await savePendingConfirmation(telefono, "registrar_abono", {
        cliente_codigo: args.cliente_codigo,
        monto: args.monto,
        medio_pago: args.medio_pago || "efectivo",
        observacion: args.observacion,
      });
      return {
        pendiente_confirmacion: true,
        mensaje: `Confirmar abono $${args.monto} de ${c.nombre} (${c.codigo}). Responde SI para confirmar.`,
      };
    }
    default:
      return { error: "Tool desconocida" };
  }
}

export async function handleConfirmation(telefono, text, actor) {
  const norm = text.trim().toUpperCase();
  if (norm !== "SI" && norm !== "SÍ" && norm !== "CONFIRMO") {
    return null;
  }
  const pending = await consumePendingConfirmation(telefono);
  if (!pending) return { error: "No hay operacion pendiente de confirmar." };
  const result = await executeConfirmedAction(pending.action_type, pending.payload, actor);
  return { ok: true, accion: pending.action_type, result };
}
