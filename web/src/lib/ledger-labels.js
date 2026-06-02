const LABELS = {
  cargo: "Factura",
  abono: "Cobranza",
  a_cuenta: "A cuenta",
  pago_contado: "Pago contado",
};

export function ledgerLabel(tipo) {
  return LABELS[tipo] || tipo;
}

export function ledgerTone(tipo) {
  if (tipo === "cargo") return "warning";
  if (tipo === "pago_contado") return "neutral";
  return "positive";
}
