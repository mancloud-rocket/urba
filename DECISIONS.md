# Decisiones de producto URBA

Documento de referencia (validar con papá en reunión corta).

## Pago al contado — Opción A (implementada)

- Tipo DB: `pago_contado` en `ledger_tipo`
- **No altera** el saldo de cuenta corriente (excluido de `client_balances` y aging)
- Aparece en historial del cliente en sección aparte "Pagos al contado"
- Cierre de caja: suma por `medio_pago` del día

## Cierre de caja — reglas por defecto

- Un cierre por día (`fecha` UNIQUE)
- Estados: `borrador` (editable) | `cerrado` (solo admin puede reabrir en v2)
- Auto-borrador desde ledger del día:
  - `cargo` → `venta_credito` (fiado del día)
  - `pago_contado` → `venta_efectivo` / `venta_tarjeta` / `venta_transferencia` según medio
  - `abono` → `cobranza_cc` (cobro de deuda; no cuenta como venta nueva del día)
- Gastos manuales: combustible, comida, UTE, etc.

## Auth

- Supabase Auth (email/password) en web
- Roles: `admin`, `operador`, `cajero`
- API: JWT Bearer; bypass local con `AUTH_DISABLED=true`
