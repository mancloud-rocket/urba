# URBA — Manual de marca

> *Tu obra en orden.*

URBA es el sistema operativo de cuenta corriente para barracas de materiales de construcción. Nace de tres generaciones Urbano trabajando en el sector y se construye como software de grado fintech.

---

## 1. Posicionamiento

### Producto en una frase

**URBA es el panel de control de la cuenta corriente de una barraca: ve quién debe, cobra a tiempo y trabaja desde WhatsApp.**

### Audiencia

| Persona | Dolor actual | Lo que URBA cambia |
|---|---|---|
| **Dueño de barraca** (papá Urbano) | Excel local, fórmulas rotas, no sabe quién le debe hoy | Saldo en vivo desde el celular, alertas de vencimiento |
| **Empleado de mostrador** | Anota fiado en cuaderno y después tipea | Carga el cargo por WhatsApp en 5 segundos |
| **Hijo / sucesor** | Quiere modernizar sin romper lo que funciona | Migra el Excel tal cual y suma agente IA encima |

### Mercado objetivo

LATAM hispanohablante: barracas, ferreterías grandes, distribuidores de materiales, casas de electrodomésticos con cuenta corriente. ~80% del sector sigue en Excel + WhatsApp suelto. URBA une las dos cosas.

### Promesa central

> **De Excel a sistema en una tarde, sin perder ni una línea.**

### Diferenciadores

1. **Es para barracas, no para todos.** No es "ERP genérico". Vocabulario, plazos y flujos del sector.
2. **WhatsApp como interfaz primaria.** Papá ya tiene WhatsApp abierto. URBA vive ahí.
3. **Agente IA acotado.** Sin chat libre — tools específicas con confirmación. Cero alucinación de saldos.
4. **Construido por una familia del rubro.** No por consultores tech de paso.

---

## 2. Nombre

### URBA

- Raíz: **Urb**ano (apellido familiar) + **a** abierta
- Lecturas paralelas: urb·**ano**, **urb**·anización, **urb**·e
- 4 letras. Memorable, pronunciable en español/portugués/inglés sin pérdida.
- Dominios objetivo: `urba.app`, `urba.com.uy`, `urba.io`
- Handle social: `@usaurba`

### Ortografía

- Siempre en mayúsculas en el logo: **URBA**
- En texto corrido, capitalizado: **Urba** (no "urba" minúscula salvo en URLs/código)
- Nunca con acento: ~~Urbá~~

### Pronunciación

`/ˈuɾ.ba/` — dos sílabas planas. Como "urbe" sin la e.

### Eslogan

**Tu obra en orden.**

- "Obra" = la obra de construcción **y** la obra/esfuerzo del negocio familiar.
- "En orden" = literal (ordenado, sin desprolijidades) e idiomático ("todo en orden").
- 4 palabras, 4 letras del logo. Simetría.

### Tagline largo (para web/pitch)

**El sistema operativo de cuenta corriente para barracas.**

### Voz de marca

| Sí | No |
|---|---|
| Directo y técnico | Marketinero, exagerado |
| Rioplatense neutro | Anglicismos innecesarios |
| Confianza tranquila | "Revoluciona tu negocio" |
| Cifras concretas | Adjetivos vacíos |
| Habla de obra, cemento, fiado | Habla de "soluciones disruptivas" |

**Ejemplo de copy on-brand:**

> Tu cliente debe $4.500 desde hace 12 días. URBA te avisa por WhatsApp y registra el cobro con un mensaje.

**Off-brand (evitar):**

> Revoluciona la gestión financiera de tu PyME con nuestra plataforma all-in-one impulsada por IA.

---

## 3. Identidad visual

### Principio rector

> **Disciplina de Linear, calidez de barraca — en light mode.**

Sistema light con glass sutil, un unico acento cromático amber, tipografía de grado técnico. Sin gradientes pesados, sin bordes duros. La obra es lo que da el color: ámbar de casco, gris cálido de cemento.

### Paleta (tema claro — producción)

#### Superficies

| Token | Hex | Uso |
|---|---|---|
| `bg-canvas` | `#F6F5F2` | Fondo app, gradiente cálido |
| `bg-panel` | `#FFFFFF` | Cards, paneles (glass 88%) |
| `bg-elevated` | `#FCFBF8` | Hover, dropdown |
| `glass` | `white / 72%` + blur 20px | Sidebar, topbar |

#### Texto

| Token | Hex | Uso |
|---|---|---|
| `text-primary` | `#18181B` | Títulos, montos |
| `text-secondary` | `#3F3F46` | Labels, body |
| `text-tertiary` | `#71717A` | Metadata, hints |
| `text-quaternary` | `#A1A1AA` | Disabled, timestamps |

#### Acento único — Amber casco

| Token | Hex | Uso |
|---|---|---|
| `accent` | `#D97706` | Brand mark, primary CTA, focus ring — **solo aquí** |
| `accent-hover` | `#F59E0B` | Hover del acento |

> **Regla de oro:** un solo color cromático en pantalla. Todo lo demás es escala de grises + semántica.

#### Semántica (úsense con moderación)

| Token | Hex | Uso |
|---|---|---|
| `semantic-positive` | `#3DBC78` | Abonos, pagado, al día |
| `semantic-warning` | `#E8A33D` | Vence hoy, requiere atención |
| `semantic-critical` | `#E5484D` | Vencido, deuda crítica |
| `semantic-info` | `#7BA7FF` | Información, neutral |

### Tipografía

Tres familias. Cada una hace una sola cosa.

| Familia | Rol | Especificidad |
|---|---|---|
| **Geist** | UI, body, títulos | Weight 500 para énfasis (sello tipo Linear 510) |
| **Geist Mono** | Montos, códigos, IDs | Tabular nums activadas |
| **Fraunces** | Display editorial (landing, hero) | Solo en piezas de marca, no en app |

**Escala (UI):**

| Nombre | Tamaño | Tracking | Peso |
|---|---|---|---|
| `display` | 36px | -0.022em | 600 |
| `h1` | 22px | -0.018em | 600 |
| `h2` | 16px | -0.012em | 500 |
| `body` | 14px | -0.008em | 400 |
| `caption` | 12px | -0.004em | 500 |
| `eyebrow` | 11px uppercase | +0.10em | 500 |

**Reglas:**

- Negative tracking en tamaños grandes. Positive en eyebrows uppercase.
- Montos **siempre** en Geist Mono con `font-variant-numeric: tabular-nums`.
- Nunca usar más de 3 pesos por pantalla.
- Códigos de cliente (`C01`, `A234884`) en mono, color tertiary.

### Iconografía

- Stroke `1.5px`, line caps `round`, line joins `round`.
- Tamaño base `16px` UI, `20px` navegación, `24px` empty states.
- Sin fills salvo el logo.
- Set custom (no Heroicons/Lucide defaults visibles).

### Espaciado

Base 4px. Escala: **4, 8, 12, 16, 20, 24, 32, 40, 56, 80**.

### Bordes y elevación

- Radius: `6px` chips, `8px` inputs, `10px` cards, `14px` modals, `9999px` pills.
- **Sin sombras.** La jerarquía viene de surface lift (`#0F1011` → `#16171A`).

### Motion

- Duración: `120ms` micro, `220ms` componente, `420ms` page reveal.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (out-expo suave).
- Staggered reveal en carga de página (50ms entre hijos).
- **Sin bouncing, sin spin innecesario, sin parallax.**

---

## 4. Logo

### Concepto

Un cuadrado oscuro con una **U** geométrica formada por un ladrillo amarillo apoyado horizontalmente. La U sugiere:

- Inicial de **U**rba / **U**rbano
- Forma de balde / contenedor / cuenta corriente que recibe
- Arco de un dintel, elemento estructural primario

### Construcción

```
┌─────────────┐
│             │   Cuadrado bg-canvas, radius 8px
│  ███ ███    │   Dos pilares amber, gap central
│  █     █    │   Stroke 2.5px
│  █     █    │
│  ███████    │   Base amber sólida
│             │
└─────────────┘
```

### Variantes

1. **Mark** — el cuadrado solo (favicons, app icon, sidebar)
2. **Wordmark** — `URBA` en Geist 600, tracking -0.04em
3. **Lockup horizontal** — mark + wordmark con gap 8px
4. **Lockup con eslogan** — wordmark + "Tu obra en orden" en caption tertiary

### Don'ts

- No rotar la U
- No cambiar el amber por otro color
- No agregar sombra/gradiente
- No usar sobre fondos con foto sin overlay sólido

---

## 5. Tono comercial y mensajes

### Hero principal

> **Tu obra en orden.**  
> URBA es la cuenta corriente que vive donde tu equipo ya trabaja: WhatsApp y un panel que abre en segundos.

### Bullets de venta

- **De Excel a URBA en una tarde.** Importás tus dos archivos y arrancás.
- **WhatsApp es la app.** Tu equipo ya sabe usarla. URBA aprende cuando le hablás.
- **Cero alucinación.** El agente nunca inventa un saldo — siempre consulta la base.
- **Tu negocio, tus números.** Base propia, exportable, sin lock-in.

### Objeciones frecuentes

| Objeción | Respuesta |
|---|---|
| "Mi viejo no usa apps nuevas" | Mandá un mensaje de WhatsApp. Esa es la app. |
| "Excel ya me funciona" | Hasta que se rompe la fórmula o queda en otra compu. |
| "¿Es seguro?" | Tus datos son tuyos. Backup diario, export con un clic. |
| "¿Y si me arrepiento?" | Te devolvemos los Excel actualizados al día de la baja. |

---

## 6. Penetración de mercado (go-to-market)

### Fase 0 — Pilot familiar (mes 1-2)

- Cliente único: barraca de papá Urbano.
- Métrica de éxito: papá deja de abrir el Excel por 30 días seguidos.
- Output: testimonio en video + caso de uso publicable.

### Fase 1 — Referidos directos (mes 3-4)

- 5 barracas conocidas de la red de papá (proveedores Enxuta, Joacamar, distribuidores).
- Precio: USD 30/mes (anclado bajo) con onboarding gratis.
- Canal: visita en persona + WhatsApp. **Cero ads.**

### Fase 2 — Ferreterías y casas afines (mes 5-8)

- 30 cuentas. Onboarding asistido.
- Webinar semanal abierto (30 min, "de Excel a URBA en vivo").
- Materiales: 1 caso de éxito por mes en video corto.

### Fase 3 — Producto-led (mes 9+)

- Trial 14 días self-serve.
- Plantillas por rubro (barraca, ferretería, electrodomésticos, distribuidor).
- Pricing tiered: Solo (USD 30), Equipo (USD 80, hasta 5 usuarios WA), Multi-sucursal (USD 200).

### Canales (ranking de inversión)

1. **Boca a boca dentro del rubro** (mayor ROI, foco fase 0-2)
2. **WhatsApp orgánico** (compartir estados, audios de papá)
3. **YouTube/TikTok casos reales** (papá explicando, no producción overpolished)
4. **Cámaras y agremiaciones** (Cámara de Comercio, Asociación de Ferreteros)
5. Google Ads — **último recurso**, marketing de adquisición caro y poco fit

### Métricas Norte

- **Time-to-first-value**: < 2 horas (importar Excel y ver saldo del primer cliente)
- **Activación**: 5 movimientos cargados en la primera semana
- **Retención M3**: > 80% (si pasa el mes 3, se queda años — es CC, hay lock-in natural)

---

## 7. Naming de features

Reglas:

- Verbos en infinitivo para acciones (`Registrar cargo`, no "Cargo nuevo")
- Sustantivos cortos para módulos (`Cartera`, `Ventas`, `Agente`, no "Gestión de cuentas corrientes")
- **Cero anglicismos visibles**. "Dashboard" → `Panel`. "Onboarding" → `Primer día`. "Settings" → `Ajustes`.

### Glosario URBA

| Término | Significado |
|---|---|
| **Cartera** | Total de saldos por cobrar |
| **Cargo** | Nueva deuda del cliente (fiado) |
| **Abono** | Pago recibido |
| **Aging** | Distribución de deuda por vencimiento |
| **Vencido** | Cargo con `fecha_vencimiento < hoy` y saldo > 0 |
| **Plazo** | Días de crédito acordados con el cliente |
| **Agente** | Capa IA que opera por WhatsApp/web |

---

## 8. Activos y archivos

- `web/src/components/Logo.jsx` — mark + wordmark React
- `web/src/index.css` — tokens CSS
- `web/tailwind.config.js` — escala completa
- `web/public/favicon.svg` — favicon vectorial
- `MARCA.md` — este documento (fuente única de verdad)

Cualquier cambio de marca pasa por este archivo antes del código.

---

**URBA. Tu obra en orden.**  
Familia Urbano · 2026
