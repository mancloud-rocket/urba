# URBA — WhatsApp completo (Meta Cloud API)

Guia paso a paso para conectar WhatsApp al agente URBA en Render.

**Prerequisitos:** API en Render funcionando (`/health` con `"db":"postgres"`), Supabase con datos, `OPENAI_API_KEY` en Render.

---

## Arquitectura

```
Tu celular  --mensaje-->  Meta WhatsApp  --webhook POST-->  Render (/api/whatsapp/webhook)
                                                              |
                                                              v
                                                         Agente OpenAI + tools
                                                              |
                                                              v
                                                         Supabase (Postgres)
                                                              |
                         Meta WhatsApp  <--respuesta--  sendWhatsApp()
```

---

## Parte 1 — Crear app en Meta (15 min)

### 1.1 Cuenta de desarrollador

1. Entra a [developers.facebook.com](https://developers.facebook.com).
2. Inicia sesion con tu cuenta Facebook/Meta.
3. Si es la primera vez, acepta terminos de desarrollador.

### 1.2 Crear la app

1. **My Apps** (menu arriba derecha) → **Create App**.
2. Caso de uso: **Other** → **Next**.
3. Tipo: **Business** → **Next**.
4. Nombre: `URBA` → **Create app**.
5. Te puede pedir contrasena o verificacion — completa.

### 1.3 Agregar WhatsApp

1. En el dashboard de la app → **Add Product**.
2. Busca **WhatsApp** → **Set up**.
3. Te lleva a **WhatsApp > API Setup**.

---

## Parte 2 — Modo prueba / sandbox (gratis)

En **WhatsApp > API Setup** veras:

| Campo | Que es |
|-------|--------|
| **From** | Numero de prueba de Meta (al que vas a escribir) |
| **Phone number ID** | ID tecnico → `WHATSAPP_PHONE_NUMBER_ID` |
| **WhatsApp Business Account ID** | Solo referencia, no lo necesitas en .env |
| **Temporary access token** | Token corto (~24h) → `WHATSAPP_ACCESS_TOKEN` |

### 2.1 Agregar destinatarios de prueba

Solo los numeros que agregues aca pueden hablar con el bot en modo prueba.

1. En **To** → **Manage phone number list**.
2. **Add phone number**.
3. Ingresa tu numero con codigo pais: `+598 99 XXX XXX`.
4. Meta envia un codigo por WhatsApp → ingresalo.
5. Repeti para el numero de papá si queres.

---

## Parte 3 — Variables en Render

Render → tu servicio **urba-api** → **Environment** → agrega o verifica:

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `WHATSAPP_VERIFY_TOKEN` | String secreto que inventas | `urba-wa-secreto-2025` |
| `WHATSAPP_ACCESS_TOKEN` | Token de Meta (API Setup) | `EAAxxxx...` |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID de Meta | `123456789012345` |
| `ALLOWED_PHONES` | Numeros autorizados, sin +, coma separados | `59899123456,59899234567` |
| `OPENAI_API_KEY` | Key de OpenAI | `sk-...` |

**Save Changes** → Render redeploya (1-2 min).

### Formato de `ALLOWED_PHONES`

- Solo digitos, sin `+`, sin espacios.
- Uruguay: `598` + 8 digitos → `59899123456`.
- Debe coincidir con el numero desde el que escribis (el que agregaste en Meta **To**).

Tambien podes cargar numeros en Supabase → tabla `allowed_phones` (el server revisa env + DB).

---

## Parte 4 — Configurar webhook

### 4.1 URL del webhook

En Meta → **WhatsApp** → **Configuration** (no API Setup):

1. Seccion **Webhook** → **Edit**.
2. **Callback URL:**
   ```
   https://TU-SERVICIO.onrender.com/api/whatsapp/webhook
   ```
   Reemplaza `TU-SERVICIO` por tu URL real de Render.

3. **Verify token:** exactamente el mismo string que `WHATSAPP_VERIFY_TOKEN` en Render.

4. Click **Verify and save**.

   Si falla:
   - Render debe estar **despierto** (plan Starter, no free dormido).
   - Proba `https://TU-SERVICIO.onrender.com/health` en el navegador primero.
   - El verify token debe ser identico (sin espacios al final).

### 4.2 Suscribir eventos

En la misma pagina **Configuration**:

1. **Webhook fields** → **Manage**.
2. Activa **messages** → **Subscribe**.

Debe quedar suscrito con check verde.

---

## Parte 5 — Probar (checklist)

### 5.1 Prueba basica

1. Desde tu WhatsApp personal, escribi al **numero de prueba de Meta** (aparece en API Setup → From).
2. Mensaje:
   ```
   Cuanto debe C01?
   ```
3. En 5-15 segundos deberias recibir respuesta con saldo real de Supabase.

### 5.2 Prueba de cargo con confirmacion

```
Fiado 5000 a C01 referencia obra pinar
```

El bot responde resumen → vos respondes:

```
SI
```

Verifica en Supabase → `ledger_entries` → fila nueva.  
El panel web se actualiza solo (Realtime).

### 5.3 Otras frases utiles

```
Quien esta vencido?
Cobro 2000 transferencia de C02
Buscar cliente franco
Resumen de cartera
```

### 5.4 Si no responde

| Sintoma | Que revisar |
|---------|-------------|
| No pasa nada | Render Logs; webhook suscrito a `messages` |
| "Numero no autorizado" | `ALLOWED_PHONES` sin + ; numero en Meta **To** |
| Meta verifica webhook OK pero no hay respuesta | `WHATSAPP_ACCESS_TOKEN` expirado (24h) |
| Error en Render logs "WhatsApp send error: 401" | Token invalido o expirado |
| Error 403 en send | Numero destino no esta en lista de prueba de Meta |
| Respuesta "modo demo" | Falta `OPENAI_API_KEY` en Render |

Ver logs: Render → **urba-api** → **Logs** → busca `WhatsApp send error` o `webhook error`.

---

## Parte 6 — Token permanente (recomendado para produccion)

El token temporal de API Setup **expira en ~24 horas**. Para uso diario con papá:

### 6.1 Meta Business Suite

1. [business.facebook.com](https://business.facebook.com) → **Business Settings**.
2. Si no tenes Business, crealo y vincula la app URBA.

### 6.2 System User

1. **Users** → **System Users** → **Add**.
2. Nombre: `urba-bot` → Rol: **Admin**.
3. Click en el system user → **Generate New Token**.
4. App: **URBA**.
5. Permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. **Generate Token** → copia el token largo.
7. En Render → `WHATSAPP_ACCESS_TOKEN` = ese token → Save.

Este token no expira (salvo que lo revoques manualmente).

---

## Parte 7 — Numero real de la barraca (cuando esten listos)

Modo sandbox usa el numero de prueba de Meta. Para el numero propio de la barraca:

1. Meta Business verificado (documentacion de la empresa).
2. **WhatsApp** → **Phone numbers** → **Add phone number**.
3. Verificacion por SMS/llamada al numero de la barraca.
4. El **Phone number ID** cambia → actualiza `WHATSAPP_PHONE_NUMBER_ID` en Render.
5. El webhook **no cambia** — misma URL en Render.
6. Ya no necesitas agregar destinatarios en **To** (modo produccion abierto segun tu cuenta Business).

---

## Parte 8 — Seguridad (uso interno)

URBA esta pensado para uso interno de la barraca:

- **Lista blanca:** solo numeros en `ALLOWED_PHONES` / `allowed_phones`.
- **Confirmacion SI:** cargos y abonos requieren confirmacion explicita.
- **Sin n8n:** todo pasa por tu API en Render (auditable en logs y `audit_log`).

No compartas `WHATSAPP_ACCESS_TOKEN` ni lo pongas en el frontend.

---

## Variables completas Render (referencia)

```
PORT=8787
NODE_ENV=production

SUPABASE_DB_HOST=...
SUPABASE_DB_PORT=5432
SUPABASE_DB_USER=postgres.xxxxx
SUPABASE_DB_PASSWORD=...
SUPABASE_DB_NAME=postgres

OPENAI_API_KEY=sk-...

WHATSAPP_VERIFY_TOKEN=urba-wa-secreto-2025
WHATSAPP_ACCESS_TOKEN=EAAxxxx...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
ALLOWED_PHONES=59899123456,59899234567
```

---

## Costos WhatsApp

- **Sandbox / prueba:** gratis para testing con numeros registrados.
- **Produccion:** Meta cobra por conversacion (categoria utilidad/servicio). Uso interno bajo: pocos USD/mes.
- Detalle: [Meta WhatsApp Pricing](https://developers.facebook.com/docs/whatsapp/pricing).

---

## Resumen rapido (TL;DR)

1. Meta Developers → app URBA → WhatsApp → API Setup → copiar token + phone ID.
2. Agregar tu numero en **To** (lista de prueba).
3. Render env vars: `WHATSAPP_*`, `ALLOWED_PHONES`, `OPENAI_API_KEY`.
4. Meta Configuration → webhook → `https://TU-API.onrender.com/api/whatsapp/webhook` + verify token.
5. Suscribir **messages**.
6. Escribir al numero de prueba: `Cuanto debe C01?`
7. Token permanente via System User cuando funcione la prueba.
