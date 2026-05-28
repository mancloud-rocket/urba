import { all, D } from "../db.js";

function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9@.\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text) {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length >= 2);
}

function scoreClient(client, rawQuery) {
  const q = normalize(rawQuery);
  if (!q) return 0;

  const codigo = normalize(client.codigo);
  const nombre = normalize(client.nombre);
  const barrio = normalize(client.barrio);
  const direccion = normalize(client.direccion);
  const email = normalize(client.email);
  const tel = normalize(String(client.telefono ?? ""));
  const tel2 = normalize(String(client.telefono2 ?? ""));
  const rut = normalize(String(client.rut ?? ""));
  const id = normalize(String(client.identificacion ?? ""));

  let score = 0;

  if (codigo === q) score += 200;
  if (nombre === q) score += 180;
  if (codigo.includes(q)) score += 80;
  if (nombre.includes(q)) score += 70;
  if (barrio.includes(q)) score += 35;
  if (direccion.includes(q)) score += 25;
  if (email.includes(q)) score += 40;
  if (tel.includes(q) || tel2.includes(q)) score += 60;
  if (rut.includes(q) || id.includes(q)) score += 55;

  const qTokens = tokens(rawQuery);
  for (const t of qTokens) {
    if (nombre.includes(t)) score += 30;
    if (codigo.includes(t)) score += 25;
    if (barrio.includes(t)) score += 12;
    if (direccion.includes(t)) score += 8;
    if (email.includes(t)) score += 10;
    if (tel.includes(t) || tel2.includes(t)) score += 20;
  }

  // Bonus si todas las palabras del query aparecen en el nombre
  if (qTokens.length > 1 && qTokens.every((t) => nombre.includes(t))) {
    score += 45;
  }

  return score;
}

export async function searchClientsSmart(query, limit = 10) {
  const rows = await all(`SELECT * FROM clients WHERE activo = ${D.activeTrue()}`);
  return rows
    .map((client) => ({ client, score: scoreClient(client, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function resolveClient(query) {
  const q = String(query ?? "").trim();
  if (!q) {
    return { encontrado: false, mensaje: "Indica un nombre, codigo, telefono o barrio para buscar." };
  }

  const ranked = await searchClientsSmart(q, 8);
  if (ranked.length === 0) {
    return {
      encontrado: false,
      mensaje: `No encontre clientes que coincidan con "${q}".`,
    };
  }

  const top = ranked[0];
  const second = ranked[1];
  const gap = second ? top.score / Math.max(second.score, 1) : 999;
  const unico = ranked.length === 1 || gap >= 1.4 || top.score >= 100;

  if (unico) {
    return {
      encontrado: true,
      unico: true,
      codigo: top.client.codigo,
      cliente: top.client,
      confianza: top.score,
    };
  }

  return {
    encontrado: true,
    unico: false,
    mensaje: `Hay varios clientes parecidos a "${q}". Pedi precision o usa el codigo.`,
    candidatos: ranked.slice(0, 5).map(({ client, score }) => ({
      codigo: client.codigo,
      nombre: client.nombre,
      barrio: client.barrio,
      telefono: client.telefono,
      confianza: score,
    })),
  };
}

export async function resolveClientCodigo(queryOrCodigo) {
  const byCode = await all(
    `SELECT * FROM clients WHERE activo = ${D.activeTrue()} AND UPPER(codigo) = UPPER(?) LIMIT 1`,
    [String(queryOrCodigo).trim()]
  );
  if (byCode[0]) {
    return { encontrado: true, unico: true, codigo: byCode[0].codigo, cliente: byCode[0] };
  }
  return resolveClient(queryOrCodigo);
}
