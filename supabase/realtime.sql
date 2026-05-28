-- URBA - Habilitar Supabase Realtime (ejecutar en SQL Editor si el proyecto ya existe)
-- Tambien incluido al final de schema.sql para proyectos nuevos

ALTER TABLE clients REPLICA IDENTITY FULL;
ALTER TABLE ledger_entries REPLICA IDENTITY FULL;
ALTER TABLE sales_lines REPLICA IDENTITY FULL;
ALTER TABLE suppliers REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE ledger_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_lines;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;

-- Realtime exige SELECT via RLS para la clave anon/public del frontend
CREATE POLICY "anon_select_clients" ON clients FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_ledger" ON ledger_entries FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_sales" ON sales_lines FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_suppliers" ON suppliers FOR SELECT TO anon USING (true);
