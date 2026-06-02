# Migraciones URBA

Aplicar en orden en Supabase SQL Editor (proyectos existentes):

1. `001_ledger_invoices.sql`
2. `002_notification_log.sql`
3. `003_cash_closure.sql`
4. `004_expenses.sql`
5. `005_app_users_rbac.sql`

Proyectos nuevos pueden usar `schema.sql` completo.

Variables nuevas en Render:

- `SUPABASE_JWT_SECRET` (JWT Secret del proyecto Supabase)
- `AUTH_DISABLED=true` solo en desarrollo local
- `CRON_SECRET` opcional para `/api/internal/expenses/check`
