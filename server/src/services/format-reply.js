/**
 * Convierte markdown del agente a texto legible en WhatsApp.
 * WhatsApp usa *negrita* con asteriscos simples.
 */
export function markdownToWhatsApp(text) {
  let s = String(text ?? "");

  s = s.replace(/^#{1,3}\s+(.+)$/gm, "\n*$1*\n");
  s = s.replace(/\*\*(.+?)\*\*/g, "*$1*");
  s = s.replace(/__(.+?)__/g, "*$1*");
  s = s.replace(/^\s*[-*]\s+/gm, "• ");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}
