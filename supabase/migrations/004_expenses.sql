CREATE TABLE IF NOT EXISTS expense_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  dia_vencimiento INTEGER CHECK (dia_vencimiento BETWEEN 1 AND 28),
  monto_referencia NUMERIC(14,2),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES expense_templates(id) ON DELETE CASCADE,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fecha_pago DATE NOT NULL,
  monto NUMERIC(14,2) NOT NULL,
  registrado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, anio, mes)
);

INSERT INTO expense_templates (nombre, dia_vencimiento, monto_referencia)
SELECT v.nombre, v.dia, v.monto FROM (VALUES
  ('UTE', 10, NULL::numeric),
  ('OSE', 15, NULL::numeric),
  ('Antel', 20, NULL::numeric),
  ('Alquiler', 5, NULL::numeric)
) AS v(nombre, dia, monto)
WHERE NOT EXISTS (SELECT 1 FROM expense_templates e WHERE e.nombre = v.nombre);

ALTER TABLE expense_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON expense_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON expense_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
