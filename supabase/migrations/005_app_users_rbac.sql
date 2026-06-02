DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'operador', 'cajero');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY,
  nombre TEXT NOT NULL,
  rol app_role NOT NULL DEFAULT 'operador',
  telefono TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE allowed_phones
  ADD COLUMN IF NOT EXISTS app_user_id UUID REFERENCES app_users(id);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON app_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
