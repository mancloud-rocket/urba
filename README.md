# BALDE

**Cuentas firmes. Obra al dia.**

Agente de cuenta corriente para barracas y comercios de materiales de construccion. Reemplaza Excel con web, base de datos e IA por WhatsApp.

## Marca

| Elemento | Valor |
|----------|-------|
| Nombre | **BALDE** |
| Eslogan | Cuentas firmes. Obra al dia. |
| Tono | Directo, confiable, techie sin frialdad |
| Paleta | Navy `#15202B`, ladrillo `#C8553D`, cemento `#94A3B8`, tech `#2563EB`, fondo `#E8ECF3` |

## Modulos

1. **Cuenta corriente** — clientes, cargos, abonos, aging, vencimientos
2. **Ventas por proveedor** — lineas por marca (Enxuta, Joacamar, etc.), margen e IVA
3. **Agente IA** — consultas y cargas por WhatsApp (solo numeros autorizados) o chat web

## Inicio rapido

```bash
# 1. Migrar Excel de ctacts/ a seed.json
cd balde
python scripts/migrate_from_excel.py

# 2. Instalar dependencias
npm install
npm install --prefix server
npm install --prefix web

# 3. Configurar (opcional)
cp server/.env.example server/.env
# Agregar OPENAI_API_KEY para agente completo

# 4. Arrancar API + frontend
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:8787/health

La base SQLite se crea y carga sola al iniciar el servidor (`server/data/balde.db`).

## WhatsApp (Meta Cloud API)

Variables en `server/.env`:

```
WHATSAPP_VERIFY_TOKEN=balde-verify
WHATSAPP_ACCESS_TOKEN=tu_token
WHATSAPP_PHONE_NUMBER_ID=tu_phone_id
ALLOWED_PHONES=59899123456,59899234567
```

Webhook URL: `https://tu-dominio/api/whatsapp/webhook`

Escrituras por WhatsApp requieren confirmacion: el agente responde un resumen y el usuario debe escribir **SI**.

## Produccion (Supabase)

Guia completa paso a paso: **[DEPLOY.md](DEPLOY.md)**

Resumen:

1. Crear proyecto Supabase y ejecutar [`supabase/schema.sql`](supabase/schema.sql)
2. `DATABASE_URL` en `server/.env` → `npm run seed --prefix server`
3. Deploy API en Render + web en Vercel
4. Webhook WhatsApp Meta apuntando a `/api/whatsapp/webhook`

Sin `DATABASE_URL` el server usa SQLite local automaticamente.

## Estructura

```
balde/
  scripts/migrate_from_excel.py   # Excel -> seed.json
  server/                         # API Express + SQLite + agente
  web/                            # React + Tailwind (responsive)
  supabase/schema.sql             # Postgres produccion
```

## Datos demo

Los Excel en `../ctacts/` se migran automaticamente:

- `FACTURAS PENDIENTES.xlsm` -> clientes + movimientos CC
- `ELECTRODOMESTICOS.xlsx` -> proveedores + ventas

## Agente — frases de prueba

- "Cuanto debe C01?"
- "Quien esta vencido?"
- "Fiado 5000 a C02 referencia obra"
- "Cobre 2000 transferencia de Franco" (luego responder SI)

Sin `OPENAI_API_KEY` el agente funciona en modo demo con respuestas basicas.
