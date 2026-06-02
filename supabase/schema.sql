-- URBA - Schema PostgreSQL (Supabase production)
-- Ejecutar en SQL Editor de Supabase (una sola vez por proyecto)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE ledger_tipo AS ENUM ('cargo', 'abono', 'a_cuenta', 'pago_contado');
CREATE TYPE app_role AS ENUM ('admin', 'operador', 'cajero');
CREATE TYPE medio_pago AS ENUM ('efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro');
CREATE TYPE estado_venta AS ENUM ('pedido', 'entregado', 'debe', 'pagado', 'parcial', 'otro');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'pagado', 'parcial', 'otro');

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  rut TEXT,
  identificacion TEXT,
  telefono TEXT,
  telefono2 TEXT,
  direccion TEXT,
  barrio TEXT,
  email TEXT,
  plazo_dias INTEGER NOT NULL DEFAULT 7,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  referencia TEXT,
  tipo ledger_tipo NOT NULL,
  monto NUMERIC(14,2) NOT NULL CHECK (monto >= 0),
  medio_pago medio_pago,
  fecha_vencimiento DATE,
  observacion TEXT,
  estado TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  codigo_producto TEXT,
  producto TEXT NOT NULL,
  usd_venta NUMERIC(14,2),
  usd_costo NUMERIC(14,2),
  iva NUMERIC(14,2),
  nro_factura TEXT,
  modalidad TEXT,
  estado_venta estado_venta DEFAULT 'otro',
  fecha_venta DATE,
  estado_pago estado_pago DEFAULT 'pendiente',
  fecha_pago DATE,
  banco TEXT,
  nro_transaccion TEXT,
  nro_recibo TEXT,
  ledger_entry_id UUID REFERENCES ledger_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE allowed_phones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefono TEXT NOT NULL UNIQUE,
  nombre TEXT,
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE pending_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefono TEXT NOT NULL,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_client ON ledger_entries(client_id);
CREATE INDEX idx_ledger_vencimiento ON ledger_entries(fecha_vencimiento);
CREATE INDEX idx_sales_supplier ON sales_lines(supplier_id);
CREATE INDEX idx_sales_client ON sales_lines(client_id);

CREATE OR REPLACE VIEW client_balances
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
LEFT JOIN ledger_entries le ON le.client_id = c.id AND le.tipo != 'pago_contado'
GROUP BY c.id, c.codigo, c.nombre, c.plazo_dias, c.telefono;

-- RLS: el backend usa DATABASE_URL (service role) y bypasea RLS.
-- Estas politicas protegen acceso directo via Supabase Data API con auth.
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON ledger_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON sales_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON allowed_phones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON pending_confirmations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime (frontend escucha cambios y refresca via API)
ALTER TABLE clients REPLICA IDENTITY FULL;
ALTER TABLE ledger_entries REPLICA IDENTITY FULL;
ALTER TABLE sales_lines REPLICA IDENTITY FULL;
ALTER TABLE suppliers REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE ledger_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_lines;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;

CREATE POLICY "anon_select_clients" ON clients FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_ledger" ON ledger_entries FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_sales" ON sales_lines FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_suppliers" ON suppliers FOR SELECT TO anon USING (true);

-- Extensiones v2 (ver migrations/ en proyectos existentes)
CREATE TABLE client_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  ledger_entry_id UUID REFERENCES ledger_entries(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  es_generica BOOLEAN NOT NULL DEFAULT FALSE,
  observacion TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES client_invoices(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(12,3) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(14,2),
  subtotal NUMERIC(14,2) NOT NULL
);

CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  ledger_entry_id UUID REFERENCES ledger_entries(id),
  telefono TEXT NOT NULL,
  tipo TEXT NOT NULL,
  mensaje TEXT,
  enviado BOOLEAN DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cash_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL UNIQUE,
  cerrado_por TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cash_closure_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  closure_id UUID NOT NULL REFERENCES cash_closures(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  monto NUMERIC(14,2) NOT NULL,
  es_ingreso BOOLEAN NOT NULL DEFAULT TRUE,
  referencia TEXT,
  origen TEXT NOT NULL DEFAULT 'manual',
  ledger_entry_id UUID REFERENCES ledger_entries(id)
);

CREATE TABLE cash_categories (
  codigo TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  es_ingreso BOOLEAN NOT NULL,
  orden INTEGER DEFAULT 0
);

CREATE TABLE expense_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  dia_vencimiento INTEGER CHECK (dia_vencimiento BETWEEN 1 AND 28),
  monto_referencia NUMERIC(14,2),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expense_payments (
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

CREATE TABLE app_users (
  id UUID PRIMARY KEY,
  nombre TEXT NOT NULL,
  rol app_role NOT NULL DEFAULT 'operador',
  telefono TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE allowed_phones ADD COLUMN app_user_id UUID REFERENCES app_users(id);
