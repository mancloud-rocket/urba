CREATE TABLE IF NOT EXISTS cash_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL UNIQUE,
  cerrado_por TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_closure_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  closure_id UUID NOT NULL REFERENCES cash_closures(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  monto NUMERIC(14,2) NOT NULL,
  es_ingreso BOOLEAN NOT NULL DEFAULT TRUE,
  referencia TEXT,
  origen TEXT NOT NULL DEFAULT 'manual',
  ledger_entry_id UUID REFERENCES ledger_entries(id)
);

CREATE TABLE IF NOT EXISTS cash_categories (
  codigo TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  es_ingreso BOOLEAN NOT NULL,
  orden INTEGER DEFAULT 0
);

INSERT INTO cash_categories (codigo, nombre, es_ingreso, orden) VALUES
  ('venta_credito', 'Venta a credito (fiado)', TRUE, 10),
  ('venta_efectivo', 'Venta efectivo', TRUE, 20),
  ('venta_tarjeta', 'Venta tarjeta', TRUE, 30),
  ('venta_transferencia', 'Venta transferencia', TRUE, 40),
  ('cobranza_cc', 'Cobranza cuenta corriente', TRUE, 50),
  ('gasto_combustible', 'Combustible', FALSE, 100),
  ('gasto_comida', 'Comida / viaticos', FALSE, 110),
  ('gasto_ute', 'UTE', FALSE, 120),
  ('gasto_otro', 'Otro gasto', FALSE, 199)
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE cash_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closure_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON cash_closures FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON cash_closure_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON cash_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE cash_closures REPLICA IDENTITY FULL;
ALTER TABLE cash_closure_lines REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE cash_closures;
ALTER PUBLICATION supabase_realtime ADD TABLE cash_closure_lines;
