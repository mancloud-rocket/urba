# URBA — Guia de produccion

Paso a paso para llevar URBA de local a produccion con **Supabase + Render (API) + Vercel (web) + WhatsApp Meta**.

---

## Resumen de arquitectura

```
WhatsApp (Meta)  --->  Render (Express API)  --->  Supabase (Postgres)
                              ^
Vercel (React)   -------------+
```

- **Supabase**: base de datos Postgres (free tier alcanza para arrancar).
- **Render**: API Express 24/7 (necesaria para recibir webhooks de WhatsApp).
- **Vercel**: frontend estatico.
- **OpenAI**: agente IA (API key en el server).
- **Meta WhatsApp Cloud API**: canal de mensajes.

---

## Parte 1 — Supabase (base de datos)

### 1.1 Crear proyecto

1. Entra a [supabase.com](https://supabase.com) e inicia sesion.
2. **New project** → nombre: `urba` → region cercana (ej. `South America`).
3. Guarda la **database password** (la vas a necesitar).

### 1.2 Ejecutar el schema

1. En el proyecto: **SQL Editor** → **New query**.
2. Copia todo el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. **Run**. Debe decir "Success" sin errores.

### 1.3 Obtener la connection string

1. **Project Settings** (icono engranaje) → **Database**.
2. En **Connection string**, pestana **URI**.
3. Modo recomendado para Render: **Session pooler** (puerto 5432) o **Transaction pooler** (6543).
4. Copia la URI. Reemplaza `[YOUR-PASSWORD]` por tu password real.

Ejemplo:
```
postgresql://postgres.xxxxx:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Guardala — es tu `DATABASE_URL`.

### 1.4 Cargar datos iniciales (seed)

En tu maquina local, desde la carpeta `balde/`:

```bash
# Si aun no migraste Excel:
python scripts/migrate_from_excel.py

# Instalar dependencias del server
npm install --prefix server

# Crear .env con la URI de Supabase
cp server/.env.example server/.env
# Editar server/.env y pegar DATABASE_URL=postgresql://...

# Cargar seed en Supabase
npm run seed --prefix server
```

Deberias ver: `Seed completado (Supabase).`

Verifica en Supabase → **Table Editor** → tabla `clients` (debe tener filas).

Para **re-cargar** datos (borra todo y vuelve a seedear):

```bash
# Linux / macOS
FORCE_SEED=1 npm run seed --prefix server

# Windows PowerShell
$env:FORCE_SEED=1; npm run seed --prefix server
```

---

## Parte 2 — OpenAI (agente IA)

1. Entra a [platform.openai.com](https://platform.openai.com).
2. **API keys** → **Create new secret key**.
3. Copia la key (`sk-...`).
4. Guardala como `OPENAI_API_KEY` (la vas a poner en Render en la Parte 3).

Costo estimado uso interno: USD 2–5/mes.

---

## Parte 3 — Deploy API en Render

### 3.1 Subir codigo a GitHub

Si el repo aun no esta en GitHub:

```bash
git init
git add .
git commit -m "URBA: backend Supabase + agente"
git remote add origin https://github.com/TU_USUARIO/urba.git
git push -u origin main
```

### 3.2 Crear Web Service en Render

1. [render.com](https://render.com) → **New** → **Web Service**.
2. Conecta tu repo de GitHub.
3. Configuracion:

| Campo | Valor |
|-------|-------|
| Name | `urba-api` |
| Root Directory | `balde/server` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance type | Free o Starter (USD 7/mes — free duerme tras inactividad, **malo para WhatsApp**) |

> **Importante:** Para WhatsApp necesitas un plan que **no duerma** (Starter USD 7/mes). El free tier de Render apaga el servicio y el webhook de Meta falla.

### 3.3 Variables de entorno en Render

En **Environment** del servicio, agrega:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | URI de Supabase (Parte 1.3) |
| `OPENAI_API_KEY` | `sk-...` |
| `WHATSAPP_VERIFY_TOKEN` | Un string secreto que elijas (ej. `urba-prod-2025-secreto`) |
| `WHATSAPP_ACCESS_TOKEN` | (Parte 4 — por ahora dejalo vacio) |
| `WHATSAPP_PHONE_NUMBER_ID` | (Parte 4) |
| `ALLOWED_PHONES` | Tu numero sin +, ej. `59899123456` |
| `NODE_ENV` | `production` |

**Deploy.** Cuando termine, anota la URL publica, ej:
```
https://urba-api.onrender.com
```

### 3.4 Verificar API

Abri en el navegador:
```
https://urba-api.onrender.com/health
```

Debe responder:
```json
{"ok":true,"product":"URBA","version":"1.0.0","db":"postgres"}
```

Si `db` dice `sqlite`, falta `DATABASE_URL` en Render.

---

## Parte 4 — Deploy web en Vercel

### 4.1 Crear proyecto

1. [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Importa el mismo repo.
3. Configuracion:

| Campo | Valor |
|-------|-------|
| Root Directory | `balde/web` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output | `dist` |

### 4.2 Variable de entorno

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://urba-api.onrender.com` (sin barra final) |

**Deploy.** URL resultante, ej: `https://urba.vercel.app`

### 4.3 Verificar web

Abri la URL de Vercel. El panel debe cargar clientes y datos de Supabase.

Si falla con error de red/CORS, confirma que `VITE_API_URL` apunta al API correcto.

---

## Parte 5 — WhatsApp (Meta Cloud API)

### 5.1 Crear app en Meta

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**.
2. Tipo: **Business** → nombre: `URBA`.
3. Agrega producto **WhatsApp** → **Set up**.

### 5.2 Modo prueba (sandbox — gratis)

En **WhatsApp > API Setup**:

1. Copia **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID` en Render.
2. Copia **Temporary access token** (dura 24h en prueba) → `WHATSAPP_ACCESS_TOKEN`.
   - Para produccion permanente: crea un **System User** en Business Settings con token permanente.
3. En **To**, agrega tu numero de WhatsApp personal (el de papá) como destinatario de prueba.

### 5.3 Configurar webhook

1. **WhatsApp > Configuration** → **Webhook** → **Edit**.
2. **Callback URL:**
   ```
   https://urba-api.onrender.com/api/whatsapp/webhook
   ```
3. **Verify token:** el mismo que pusiste en `WHATSAPP_VERIFY_TOKEN` en Render.
4. Click **Verify and save**.
5. Suscripcion: activa **messages**.

### 5.4 Actualizar Render

Pega `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` en las env vars de Render y redeploy si hace falta.

### 5.5 Probar WhatsApp

Desde el numero autorizado en `ALLOWED_PHONES`, manda un mensaje al numero de prueba de Meta:

```
Cuanto debe C01?
```

Deberias recibir respuesta del agente.

Para registrar un cargo:
```
Fiado 5000 a C01 referencia obra pinar
```
El agente responde un resumen → respondes **SI** → se registra en Supabase.

### 5.6 Numero real de produccion (cuando esten listos)

1. Meta Business Manager verificado.
2. **WhatsApp > Phone numbers** → Add phone number (numero de la barraca).
3. Token permanente via System User.
4. Mismo webhook — no cambia la URL.

---

## Parte 6 — Checklist final

- [ ] `https://urba-api.onrender.com/health` → `"db":"postgres"`
- [ ] Web en Vercel carga panel con clientes
- [ ] Chat web (pestaña Agente) responde con OpenAI
- [ ] Webhook Meta verificado (check verde)
- [ ] WhatsApp responde desde numero autorizado
- [ ] Cargo de prueba + confirmacion SI aparece en Supabase (`ledger_entries`)

---

## Desarrollo local (sin Supabase)

Sin `DATABASE_URL` en `server/.env`, usa SQLite automaticamente:

```bash
cd balde
python scripts/migrate_from_excel.py
npm install && npm install --prefix server && npm install --prefix web
cp server/.env.example server/.env
# Agregar OPENAI_API_KEY opcional
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:8787/health

---

## Probar webhook WhatsApp en local (ngrok)

Meta necesita HTTPS publico. Para probar sin deploy:

```bash
# Terminal 1
cd balde && npm run dev:server

# Terminal 2
npx ngrok http 8787
```

Usa la URL de ngrok en Meta webhook:
```
https://xxxx.ngrok-free.app/api/whatsapp/webhook
```

---

## Costos mensuales estimados

| Servicio | Costo |
|----------|-------|
| Supabase Free | USD 0 |
| Render Starter | ~USD 7 |
| Vercel Free | USD 0 |
| OpenAI (uso interno) | ~USD 2–5 |
| WhatsApp Cloud (utilidad, pocos msgs) | ~USD 0–5 |
| **Total** | **~USD 10–15/mes** |

---

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| Health muestra `"db":"sqlite"` en prod | Falta o esta mal `DATABASE_URL` en Render |
| Webhook Meta falla verificacion | `WHATSAPP_VERIFY_TOKEN` debe coincidir exacto |
| WhatsApp no responde | Revisa logs en Render; confirma token no expirado |
| "Numero no autorizado" | Agrega numero en `ALLOWED_PHONES` (sin +, sin espacios) |
| Web vacia / error fetch | `VITE_API_URL` mal configurado en Vercel |
| Seed falla en Supabase | Ejecutaste `schema.sql` primero? |
| SSL error con Postgres | No pongas `DATABASE_SSL=false` en Supabase prod |

---

## Proximos pasos (opcional)

- **Auth web**: Supabase Auth + login en el panel
- **Dominio propio**: `urba.tudominio.com` en Vercel + CORS restringido
- **Token WhatsApp permanente**: System User en Meta Business
- **Modulo gastos operativos**: tabla `gastos` + tool `registrar_gasto`
