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
  executeConfirmedAction,
} from "./mutations.js";

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
      name: "preparar_cargo",
      description: "Prepara fiado/cargo pendiente de confirmacion SI del usuario",
      parameters: {
        type: "object",
        properties: {
          cliente_busqueda: { type: "string", description: "Nombre o apodo si no hay codigo" },
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
      name: "preparar_abono",
      description: "Prepara cobro/abono pendiente de confirmacion SI del usuario",
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

export async function runTool(name, args, telefono) {
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

    case "resumen_cartera":
      return getDashboardStats();

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

    case "preparar_cargo": {
      const r = await resolveForWrite(args);
      if (r.error) return r;
      const c = r.cliente;
      await savePendingConfirmation(telefono, "registrar_cargo", {
        cliente_codigo: r.codigo,
        monto: args.monto,
        referencia: args.referencia,
        observacion: args.observacion,
      });
      return {
        pendiente_confirmacion: true,
        mensaje: `Confirmar cargo $${Number(args.monto).toLocaleString("es-UY")} a ${c.nombre} (${r.codigo})${args.referencia ? ` ref: ${args.referencia}` : ""}. Responde SI para confirmar.`,
      };
    }

    case "preparar_abono": {
      const r = await resolveForWrite(args);
      if (r.error) return r;
      const c = r.cliente;
      await savePendingConfirmation(telefono, "registrar_abono", {
        cliente_codigo: r.codigo,
        monto: args.monto,
        medio_pago: args.medio_pago || "efectivo",
        observacion: args.observacion,
      });
      return {
        pendiente_confirmacion: true,
        mensaje: `Confirmar abono $${Number(args.monto).toLocaleString("es-UY")} de ${c.nombre} (${r.codigo}). Responde SI para confirmar.`,
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
