-- URBA 001: pago_contado + facturas con detalle
ALTER TYPE ledger_tipo ADD VALUE IF NOT EXISTS 'pago_contado';

CREATE TABLE IF NOT EXISTS client_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  ledger_entry_id UUID REFERENCES ledger_entries(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  es_generica BOOLEAN NOT NULL DEFAULT FALSE,
  observacion TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES client_invoices(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(12,3) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(14,2),
  subtotal NUMERIC(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_client ON client_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);

DROP VIEW IF EXISTS client_balances;
CREATE VIEW client_balances
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.codigo,
  c.nombre,
  c.plazo_dias,
  c.telefono,
  COALESCE(SUM(CASE WHEN le.tipo = 'cargo' THEN le.monto ELSE 0 END), 0) AS total_cargos,
  COALESCE(SUM(CASE WHEN le.tipo IN ('abono', 'a_cuenta') THEN le.monto ELSE 0 END), 0) AS total_abonos,
  COALESCE(SUM(CASE WHEN le.tipo = 'cargo' THEN le.monto ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN le.tipo IN ('abono', 'a_cuenta') THEN le.monto ELSE 0 END), 0) AS saldo
FROM clients c
LEFT JOIN ledger_entries le ON le.client_id = c.id
GROUP BY c.id, c.codigo, c.nombre, c.plazo_dias, c.telefono;

ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON client_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON invoice_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_invoices" ON client_invoices FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_invoice_lines" ON invoice_lines FOR SELECT TO anon USING (true);

ALTER TABLE client_invoices REPLICA IDENTITY FULL;
ALTER TABLE invoice_lines REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE client_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE invoice_lines;
