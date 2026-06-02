CREATE TABLE IF NOT EXISTS notification_log (
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

CREATE INDEX IF NOT EXISTS idx_notification_client ON notification_log(client_id);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON notification_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
