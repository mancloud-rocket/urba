import {
  getClientBalances,
  getClientByCodigo,
  getClientLedger,
  getAgingSummary,
  getSuppliers,
  getSales,
  getDashboardStats,
} from "./queries.js";
import { resolveClient, resolveClientCodigo, searchClientsSmart } from "./client-search.js";
import {
  savePendingConfirmation,
  consumePendingConfirmation,
  getPendingConfirmation,
  executeConfirmedAction,
} from "./mutations.js";
import { getAppUserByPhone } from "./queries.js";

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "resolver_cliente",
      description:
        "Resuelve un cliente por nombre parcial, apodo, codigo, telefono, barrio o direccion. " +
        "Usar SIEMPRE que el usuario nombre a alguien sin codigo exacto (ej: 'andres', 'franco', 'el de solymar'). " +
        "Devuelve match unico o lista de candidatos si hay ambiguedad.",
      parameters: {
        type: "object",
        properties: {
          busqueda: { type: "string", description: "Texto libre: nombre, apodo, codigo, telefono, barrio" },
        },
        required: ["busqueda"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_cliente",
      description:
        "Busqueda amplia de clientes. Devuelve hasta 10 coincidencias con datos basicos. " +
        "Usar para explorar o cuando resolver_cliente no alcanza.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limite: { type: "number" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ficha_cliente",
      description:
        "Ficha completa de UN cliente: todos los campos (telefonos, direccion, barrio, email, plazo, RUT/CI), " +
        "saldo, totales cargo/abono, ultimos movimientos y opcionalmente ventas. " +
        "Acepta nombre o codigo en busqueda.",
      parameters: {
        type: "object",
        properties: {
          busqueda: { type: "string" },
          incluir_ventas: { type: "boolean", description: "Incluir lineas de venta del cliente" },
          limite_movimientos: { type: "number" },
        },
        required: ["busqueda"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "saldo_cliente",
      description: "Saldo actual y ultimos movimientos. Acepta busqueda por nombre/apodo o codigo exacto.",
      parameters: {
        type: "object",
        properties: {
          busqueda: { type: "string", description: "Nombre, apodo o codigo (ej: andres, C01)" },
          codigo: { type: "string", description: "Codigo exacto si ya lo conoces" },
          limite: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_clientes",
      description: "Lista todos los clientes activos con saldo. Filtrar deudores o ordenar.",
      parameters: {
        type: "object",
        properties: {
          solo_deudores: { type: "boolean" },
          orden: { type: "string", enum: ["saldo_desc", "saldo_asc", "nombre"] },
          limite: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_vencidos",
      description: "Resumen de aging: deuda vencida, vence hoy, proximos vencimientos",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "resumen_cartera",
      description: "KPIs generales: cartera, aging, stats de ventas, movimientos recientes",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_ventas",
      description: "Busca lineas de venta por proveedor, estado de pago o cliente (nombre/codigo)",
      parameters: {
        type: "object",
        properties: {
          proveedor: { type: "string" },
          estado_pago: { type: "string", enum: ["pendiente", "pagado", "parcial", "otro"] },
          cliente_busqueda: { type: "string" },
          limite: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_factura",
      description: "Prepara factura (fiado) pendiente de confirmacion SI",
      parameters: {
        type: "object",
        properties: {
          cliente_busqueda: { type: "string" },
          cliente_codigo: { type: "string" },
          monto: { type: "number" },
          referencia: { type: "string" },
          observacion: { type: "string" },
        },
        required: ["monto"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_cobranza",
      description: "Prepara cobranza (cobro) pendiente de confirmacion SI",
      parameters: {
        type: "object",
        properties: {
          cliente_busqueda: { type: "string" },
          cliente_codigo: { type: "string" },
          monto: { type: "number" },
          medio_pago: { type: "string", enum: ["efectivo", "transferencia", "tarjeta", "cheque", "otro"] },
          observacion: { type: "string" },
        },
        required: ["monto"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_pago_contado",
      description: "Prepara pago al contado (no afecta saldo CC) pendiente de confirmacion SI",
      parameters: {
        type: "object",
        properties: {
          cliente_busqueda: { type: "string" },
          cliente_codigo: { type: "string" },
          monto: { type: "number" },
          medio_pago: { type: "string", enum: ["efectivo", "transferencia", "tarjeta", "cheque", "otro"] },
          referencia: { type: "string" },
          observacion: { type: "string" },
        },
        required: ["monto", "medio_pago"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparar_factura_detalle",
      description: "Factura con lineas de detalle o mercaderias varias",
      parameters: {
        type: "object",
        properties: {
          cliente_busqueda: { type: "string" },
          cliente_codigo: { type: "string" },
          es_generica: { type: "boolean" },
          monto: { type: "number", description: "Total si es_generica" },
          lines: { type: "array", items: { type: "object" } },
          referencia: { type: "string" },
          observacion: { type: "string" },
        },
        required: ["cliente_busqueda"],
      },
    },
  },
];

async function resolveForWrite(args) {
  const key = args.cliente_codigo || args.cliente_busqueda;
  if (!key) {
    return { error: "Indica cliente_codigo o cliente_busqueda (nombre/apodo)." };
  }
  const resolved = await resolveClientCodigo(key);
  if (!resolved.encontrado) {
    return { error: resolved.mensaje || "Cliente no encontrado" };
  }
  if (!resolved.unico) {
    return {
      error: "Cliente ambiguo. Pedi que aclare con el codigo.",
      candidatos: resolved.candidatos,
    };
  }
  return { ok: true, cliente: resolved.cliente, codigo: resolved.codigo };
}

async function resolveForRead(busqueda, codigo) {
  const key = codigo || busqueda;
  if (!key) return { error: "Indica busqueda o codigo." };
  return resolveClientCodigo(key);
}

async function prepareWrite(telefono, actionType, args, label, extra = {}) {
  const r = await resolveForWrite(args);
  if (r.error) return r;
  const c = r.cliente;
  await savePendingConfirmation(telefono, actionType, {
    cliente_codigo: r.codigo,
    monto: args.monto,
    referencia: args.referencia,
    observacion: args.observacion,
    medio_pago: args.medio_pago,
    ...extra,
  });
  const ref = args.referencia ? ` ref: ${args.referencia}` : "";
  return {
    pendiente_confirmacion: true,
    mensaje: `Confirmar ${label} $${Number(args.monto).toLocaleString("es-UY")} ${actionType.includes("abono") || actionType.includes("cobranza") ? "de" : "a"} ${c.nombre} (${r.codigo})${ref}. Responde SI para confirmar.`,
  };
}

export async function runTool(name, args, telefono, context = {}) {
  switch (name) {
    case "resolver_cliente":
      return resolveClient(args.busqueda);

    case "buscar_cliente": {
      const ranked = await searchClientsSmart(args.query, args.limite || 10);
      const balances = await getClientBalances();
      return ranked.map(({ client, score }) => {
        const bal = balances.find((b) => b.id === client.id);
        return {
          codigo: client.codigo,
          nombre: client.nombre,
          barrio: client.barrio,
          telefono: client.telefono,
          email: client.email,
          saldo: bal?.saldo ?? 0,
          confianza: score,
        };
      });
    }

    case "ficha_cliente": {
      const resolved = await resolveForRead(args.busqueda);
      if (resolved.error) return resolved;
      if (!resolved.encontrado) return resolved;
      if (!resolved.unico) return resolved;

      const c = resolved.cliente;
      const balances = await getClientBalances();
      const bal = balances.find((b) => b.id === c.id);
      const movimientos = await getClientLedger(c.id, args.limite_movimientos || 12);
      let ventas = [];
      if (args.incluir_ventas) {
        ventas = (await getSales({ clientId: c.id })).slice(0, 15);
      }

      return {
        cliente: {
          codigo: c.codigo,
          nombre: c.nombre,
          rut: c.rut,
          identificacion: c.identificacion,
          telefono: c.telefono,
          telefono2: c.telefono2,
          direccion: c.direccion,
          barrio: c.barrio,
          email: c.email,
          plazo_dias: c.plazo_dias,
        },
        cuenta: {
          saldo: Number(bal?.saldo) || 0,
          total_cargos: Number(bal?.total_cargos) || 0,
          total_abonos: Number(bal?.total_abonos) || 0,
        },
        movimientos,
        ventas: args.incluir_ventas ? ventas : undefined,
      };
    }

    case "saldo_cliente": {
      const resolved = await resolveForRead(args.busqueda, args.codigo);
      if (resolved.error) return resolved;
      if (!resolved.encontrado || !resolved.unico) return resolved;

      const c = resolved.cliente;
      const balances = await getClientBalances();
      const bal = balances.find((b) => b.id === c.id);
      const movs = await getClientLedger(c.id, args.limite || 8);
      return {
        cliente: { codigo: c.codigo, nombre: c.nombre, barrio: c.barrio, plazo_dias: c.plazo_dias },
        saldo: Number(bal?.saldo) || 0,
        total_cargos: Number(bal?.total_cargos) || 0,
        total_abonos: Number(bal?.total_abonos) || 0,
        movimientos: movs,
      };
    }

    case "listar_clientes": {
      let rows = await getClientBalances();
      if (args.solo_deudores) {
        rows = rows.filter((c) => Number(c.saldo) > 0);
      }
      const orden = args.orden || "saldo_desc";
      if (orden === "saldo_asc") rows.sort((a, b) => Number(a.saldo) - Number(b.saldo));
      else if (orden === "nombre") rows.sort((a, b) => a.nombre.localeCompare(b.nombre));
      else rows.sort((a, b) => Number(b.saldo) - Number(a.saldo));

      const limite = args.limite || 20;
      return rows.slice(0, limite).map((c) => ({
        codigo: c.codigo,
        nombre: c.nombre,
        barrio: c.barrio,
        telefono: c.telefono,
        saldo: Number(c.saldo),
      }));
    }

    case "listar_vencidos":
      return getAgingSummary();

    case "resumen_cartera": {
      const user = await getAppUserByPhone(telefono.replace(/\D/g, ""));
      const rol = context.userRol || user?.rol || "operador";
      if (rol !== "admin") {
        return { error: "Resumen de cartera solo disponible para administracion." };
      }
      return getDashboardStats("admin");
    }

    case "buscar_ventas": {
      const suppliers = await getSuppliers();
      const sup = args.proveedor
        ? suppliers.find((s) => s.nombre.toLowerCase().includes(args.proveedor.toLowerCase()))
        : null;
      let clientId = null;
      if (args.cliente_busqueda) {
        const resolved = await resolveClientCodigo(args.cliente_busqueda);
        if (resolved.encontrado && resolved.unico) clientId = resolved.cliente.id;
        else if (resolved.candidatos) return { error: "Cliente ambiguo para filtrar ventas", candidatos: resolved.candidatos };
        else return { error: "Cliente no encontrado para ventas" };
      }
      const rows = await getSales({
        supplierId: sup?.id,
        clientId,
        estadoPago: args.estado_pago,
      });
      return rows.slice(0, args.limite || 20);
    }

    case "preparar_factura":
    case "preparar_cargo":
      return prepareWrite(telefono, "registrar_cargo", args, "factura");

    case "preparar_cobranza":
    case "preparar_abono":
      return prepareWrite(telefono, "registrar_abono", {
        ...args,
        medio_pago: args.medio_pago || "efectivo",
      }, "cobranza");

    case "preparar_pago_contado":
      return prepareWrite(telefono, "registrar_pago_contado", args, "pago contado");

    case "preparar_factura_detalle": {
      const r = await resolveForWrite(args);
      if (r.error) return r;
      await savePendingConfirmation(telefono, "registrar_factura_detalle", {
        cliente_codigo: r.codigo,
        es_generica: Boolean(args.es_generica),
        monto: args.monto,
        lines: args.lines,
        referencia: args.referencia,
        observacion: args.observacion,
      });
      return {
        pendiente_confirmacion: true,
        mensaje: `Confirmar factura detallada a ${r.cliente.nombre} (${r.codigo}). Responde SI para confirmar.`,
      };
    }

    default:
      return { error: "Tool desconocida" };
  }
}

const WRITE_ACTIONS = new Set([
  "registrar_cargo",
  "registrar_abono",
  "registrar_pago_contado",
  "registrar_factura_detalle",
]);

export async function handleConfirmation(telefono, text, actor) {
  const norm = text.trim().toUpperCase();
  const pendingPeek = await getPendingConfirmation(telefono);

  if (pendingPeek?.action_type === "enviar_aviso") {
    await consumePendingConfirmation(telefono);
    if (norm === "NO") {
      return { ok: true, accion: "aviso_omitido", result: null };
    }
    if (norm === "SI" || norm === "SÍ" || norm === "CONFIRMO") {
      const result = await executeConfirmedAction("enviar_aviso", pendingPeek.payload, actor);
      return { ok: true, accion: "enviar_aviso", result };
    }
    return { error: "Responde SI o NO para el aviso al cliente." };
  }

  if (norm !== "SI" && norm !== "SÍ" && norm !== "CONFIRMO") {
    return null;
  }

  const pending = await consumePendingConfirmation(telefono);
  if (!pending) return { error: "No hay operacion pendiente de confirmar." };
  const result = await executeConfirmedAction(pending.action_type, pending.payload, actor);
  return { ok: true, accion: pending.action_type, result, needs_aviso: WRITE_ACTIONS.has(pending.action_type) };
}
