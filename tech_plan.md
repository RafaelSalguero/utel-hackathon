# StockIA: Technical Plan

Plan for building the StockIA prototype with **Next.js + TypeScript + shadcn/ui + CSS Modules + lodash-es**, **no database**, and **functional programming** (no classes).

> **Translation note.** Prose and code comments are translated. Code identifiers, enum values, CSV column names, routes, file names and user-facing UI strings (the app is in Spanish) are kept as in the original so they match the codebase.

---

## 1. Scope

| Phase | Timeframe | Includes |
|---|---|---|
| **1. Inventory dashboard** | Short term (minimum delivery) | CSV upload and validation, data review, dashboard, inventory, product detail and AI Summary |
| **2. Promotions** | Medium term | AI generation of text, palette and hashtags; PNG image from a template with a QR code; download and share |
| Out of scope | Long term | Trends, Tiendanube API, database, user accounts |

**Rules that do not change:**
- **Read-only:** the app never writes to Tiendanube.
- **No database:** data lives in memory (React Context) for the duration of the session.
- **The server stores nothing:** it only acts as an intermediary to the Claude API.

---

## 2. Stack and dependencies

| Package | Use |
|---|---|
| `next` (App Router) + `react` + `typescript` | Framework, frontend and API routes |
| `shadcn/ui` (Radix UI) | Base components: Button, Card, Input, Badge, Tabs, Dialog, Toast |
| CSS Modules (`*.module.css`) | Own styles for each component and page |
| `lodash-es` | Group, sort and sum data (`groupBy`, `orderBy`, `sumBy`, `keyBy`, `uniqBy`) |
| `papaparse` + `@types/papaparse` | Read the CSV in the browser |
| `@anthropic-ai/sdk` | Calls to the Claude API from the server |
| `zod` *(recommended)* | Validate CSV rows and Claude's JSON response |
| `recharts` *(recommended)* | Charts for sales per day and per week |
| `html-to-image` *(recommended)* | Convert the promotion template to PNG |
| `qrcode` *(proposal, to be confirmed)* | Generate the promotion's QR code |
| `vitest` *(recommended)* | Tests for the pure functions |

> **Note on shadcn and CSS Modules.** shadcn/ui components are written with **Tailwind** classes, so Tailwind must be installed for them to work. Proposal: Tailwind is used **only inside `components/ui/`** (the files shadcn generates). All own code (pages, layouts and StockIA components) is styled with **CSS Modules**. Colors are shared through shadcn's CSS variables (`--primary`, `--background`, etc.), which can also be used from the CSS Modules.

**Hosting:** Vercel. The Hobby plan is fine for the demo, but it only allows non-commercial use.

**Environment variables:**

```bash
# .env.local (never committed to the repository)
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 3. Code principles

1. **No classes.** React components as functions, logic in pure functions, and modules that export functions. The only instances allowed are those a library requires, for example the Anthropic client, and they are isolated in a single file (`lib/ai/client.ts`).
2. **Pure functions and immutability.**
   - All computation lives in `lib/` and has no side effects: it receives data and returns new data.
   - Nothing is mutated: no `push` and no property reassignment; use spread, `map` and `filter`.
   - Types are `readonly`.
3. **No function composition.**
   - `flow`, `compose`, `pipe`, currying and functions that return functions are not used.
   - Steps are chained with named intermediate variables: `const filas = …; const productos = toProducts(filas);`.
   - `map`, `filter` and `reduce` with inline functions are allowed, as are lodash-es functions called directly: `sumBy(productos, 'stock')`.
4. **Errors as values.**
   - Exceptions are not thrown in domain logic. A `Result` type is used.
   - `try/catch` only at the edges: file reading, `fetch` and API calls.
5. **Effects at the edges.** File reading, `fetch`, clipboard and downloads live in hooks or API routes. Never inside `lib/domain`.
6. **Per-function imports** from lodash-es, so that tree shaking works: `import { groupBy, sumBy } from 'lodash-es'`.
7. **Client components only.** This is the simplest option for this demo, because the data lives in the browser and performance is not a priority:
   - **Pages and components:** all carry `'use client'`.
   - **`app/layout.tsx`:** the only exception. It stays minimal (imports the styles and wraps the app with `<Providers>`), because Next.js does not allow exporting `metadata` from a client component.
   - **API routes (`app/api/*/route.ts`):** run on the server naturally; they are the only server code.

```ts
// lib/fp/result.ts
export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

Usage without composition: check `if (!r.ok) return r;` and continue with `r.value`.

---

## 4. Architecture

```
 BROWSER (client)                                      SERVER (Next.js on Vercel)
 ┌───────────────────────────────────────────┐          ┌───────────────────────────────┐
 │ 1. User uploads tienda.csv                │          │                               │
 │ 2. PapaParse → raw rows                   │          │                               │
 │ 3. lib/csv: validate + normalize          │          │                               │
 │ 4. lib/domain: classify + metrics         │          │                               │
 │ 5. StoreContext stores the result         │          │                               │
 │                                           │          │                               │
 │ 6. Aggregated summary (not the CSV) ──────┼── POST ─▶│ /api/resumen ─┐               │
 │                                           │          │ /api/promo  ──┼─▶ Claude API  │
 │ 7. Validated JSON ◀───────────────────────┼──────────│ validates w/ zod ◀┘            │
 │ 8. Render: dashboard / promo              │          │ (stores nothing)              │
 │ 9. Promo template + QR → PNG (client)     │          │                               │
 └───────────────────────────────────────────┘          └───────────────────────────────┘
```

- **CSV, calculations and image:** processed on the client. The file is never uploaded to the server.
- **Server:** receives only an **aggregated summary** (fewer tokens and less data exposed) and is the only place that knows the API key.

---

## 5. Folder structure

```
stockia/
├── app/
│   ├── theme.css                  # shadcn theme: the generated theme is pasted here
│   ├── globals.css                # Imports theme.css + base styles and StockIA tokens
│   ├── layout.tsx                 # Minimal (no 'use client'): <Providers> + font
│   ├── providers.tsx              # 'use client': StoreProvider + Toaster
│   ├── page.tsx                   # 1. Upload file
│   ├── page.module.css
│   ├── revision/page.tsx          # 2. Data review
│   ├── (app)/                     # Group with bottom navigation bar
│   │   ├── layout.tsx             # BottomNav + guard "no data → /"
│   │   ├── inicio/page.tsx        # 3. Dashboard
│   │   ├── inventario/page.tsx    # 4. Inventory
│   │   ├── inventario/[sku]/page.tsx  # 5. Product detail
│   │   ├── promos/page.tsx        # 6. Create promotion
│   │   └── promos/resultado/page.tsx  # 7. Promotion ready
│   └── api/
│       ├── resumen/route.ts       # AI Summary
│       └── promo/route.ts         # Promotion content
├── components/
│   ├── ui/                        # Generated by shadcn (Tailwind only here)
│   ├── upload/ FileDrop.tsx, FileDrop.module.css
│   ├── dashboard/ KpiCard, AlertRow, SalesChart, AiSummary, TopProducts
│   ├── inventory/ ProductRow, StatusBadge, Filters, VariantBars, WeeklyChart
│   ├── promo/ PromoForm, PromoTemplate, StylePicker, CopyBlock, QrCode
│   └── layout/ BottomNav, TopBar
├── lib/
│   ├── fp/result.ts
│   ├── csv/ columns.ts, parse.ts, validate.ts, normalize.ts
│   ├── domain/ types.ts, categories.ts, metrics.ts, status.ts, summary.ts
│   ├── ai/ client.ts, prompts.ts, schemas.ts, callClaude.ts
│   ├── promo/ toPng.ts, share.ts, qr.ts
│   └── format/ money.ts, dates.ts
├── state/
│   ├── StoreContext.tsx           # createContext + Provider with useReducer
│   ├── reducer.ts                 # pure reducer
│   └── selectors.ts               # pure functions that derive data from the state
├── hooks/ useStore.ts, useCsvUpload.ts, useAiSummary.ts, usePromo.ts
├── public/ ejemplo-tienda.csv, plantilla-tienda.csv
├── scripts/ generar_ejemplo.py    # Regenerates ejemplo-tienda.csv (fixed seed)
└── tests/ (vitest: csv, metrics, status, categories)
```

---

## 6. Data model

```ts
// lib/domain/types.ts
export type CategoryId =
  | 'calzado' | 'ropa' | 'belleza' | 'electronica' | 'accesorios' | 'hogar'
  | 'alimentos' | 'juguetes' | 'deportes' | 'mascotas' | 'papeleria' | 'otros';

export type Category = { readonly id: CategoryId; readonly nombre: string; readonly emoji: string };

export type Product = {
  readonly sku: string;
  readonly producto: string;
  readonly variante: string | null;
  readonly categoriaOriginal: string | null;
  readonly categoria: Category;
  readonly precio: number;
  readonly costo: number | null;
  readonly stock: number;
};

export type Sale = {
  readonly sku: string;
  readonly fecha: string;        // YYYY-MM-DD
  readonly idPedido: string;
  readonly cantidad: number;
  readonly precioVenta: number;
};

export type StockStatus = 'por_agotarse' | 'lento' | 'sano';

export type ProductMetrics = {
  readonly sku: string;
  readonly unidades7d: number;
  readonly unidades30d: number;
  readonly ventaDiaria: number;          // units per day (28-day average)
  readonly diasParaAgotarse: number | null;  // null if there are no sales
  readonly ventasPorSemana: readonly number[];  // last 8 weeks
  readonly status: StockStatus;
};

export type RowError = { readonly fila: number; readonly motivo: string };

export type StoreData = {
  readonly productos: readonly Product[];
  readonly ventas: readonly Sale[];
  readonly errores: readonly RowError[];
  readonly fechaCorte: string;   // the most recent sale date in the file
};
```

**CSV columns** (defined earlier):
- **Required:** `sku`, `producto`, `precio`, `stock`.
- **Optional:** `variante`, `categoria`, `costo`, `precio_venta`.
- **Sale:** `fecha_venta`, `id_pedido`, `cantidad`. All three together or none.

---

## 7. CSV pipeline

```ts
// lib/csv/parse.ts  (edge: the only place with read effects)
import Papa from 'papaparse';
import { err, ok, type Result } from '@/lib/fp/result';

export const parseCsv = (file: File): Promise<Result<readonly Record<string, string>[]>> =>
  new Promise((resolve) =>
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: ({ data }) => resolve(ok(data)),
      error: (e) => resolve(err(`No se pudo leer el archivo: ${e.message}`)),
    }),
  );
```

```ts
// lib/csv/normalize.ts  (pure, no composition)
import { uniqBy } from 'lodash-es';

// validateRows: rows -> { validas, errores }   (zod per row, keeps the row number)
// toProducts:   valid rows -> Product[]  (one per sku, takes the first row)
// toSales:      rows with fecha_venta -> Sale[]

export const toProducts = (rows: readonly ValidRow[]): readonly Product[] => {
  const primeraPorSku = uniqBy(rows, 'sku');
  return primeraPorSku.map((row) => rowToProduct(row));
};

export const toSales = (rows: readonly ValidRow[]): readonly Sale[] => {
  const conVenta = rows.filter((row) => row.fecha_venta !== '');
  return conVenta.map((row) => rowToSale(row));
};

// lib/csv/index.ts: the steps one after another, with named variables
export const buildStoreData = (rows: readonly Record<string, string>[]): Result<StoreData> => {
  const columnas = checkColumns(rows);
  if (!columnas.ok) return columnas;

  const { validas, errores } = validateRows(rows);
  const productos = toProducts(validas);
  const ventas = toSales(validas);
  const fechaCorte = latestDate(ventas);

  return ok({ productos, ventas, errores, fechaCorte });
};
```

**Validations:**
- **Required columns:** if any is missing, the file is rejected with a clear message.
- **Rows:** each row is validated with zod (valid numbers, date in `YYYY-MM-DD`, and the three sale columns together or none). An invalid row is skipped and its number is reported on the review screen.
- **Size limit:** 5 MB is suggested for the demo; it can be adjusted.

**Classification:** `lib/domain/categories.ts` is the regular-expression classifier we already defined, written as an immutable array of rules and a `classifyProduct(producto, categoria)` function.

---

## 8. Metrics and statuses (pure functions)

The reference date is **`fechaCorte`**: the most recent sale in the file, not today's date. This way the hypothetical example always gives the same results.

| Metric | Formula |
|---|---|
| Sales 7 and 30 days | Sum of `cantidad × precioVenta` in the window, counting backwards from `fechaCorte` |
| Change | (current window − previous window) / previous window |
| Units in stock | `sumBy(productos, 'stock')` |
| Inventory value | `sumBy(productos, p => p.stock * p.precio)` |
| Daily sales rate | Units sold in the last 28 days / 28 |
| Days until stockout | `stock / ventaDiaria`; `null` if `ventaDiaria = 0` |
| Sales per day | 14-day series (`groupBy` date and fill empty days with 0) |
| Best sellers | `orderBy` 30-day units, top 5 |

**Statuses.** The thresholds are proposals and stay as configurable constants:

| Status | Proposed rule |
|---|---|
| `lento` | Stock greater than 0 and **0 sales in 30 days** |
| `por_agotarse` | `diasParaAgotarse ≤ 7`. Includes sold-out products (stock 0) that had recent sales |
| `sano` | Everything else |

```ts
// lib/domain/status.ts
export const UMBRALES = { diasCriticos: 7, diasSinVenta: 30 } as const;

export const toStatus = (
  m: Pick<ProductMetrics, 'diasParaAgotarse' | 'unidades30d'>,
  stock: number,
): StockStatus => {
  if (stock > 0 && m.unidades30d === 0) return 'lento';
  if (m.diasParaAgotarse !== null && m.diasParaAgotarse <= UMBRALES.diasCriticos) return 'por_agotarse';
  return 'sano';
};
```

*Note:* the "stock ≤ 5" rule was discarded. With the example data it flagged products with more than 80 days of coverage as critical.

**Selectors** (`state/selectors.ts`): pure functions, memoized with `useMemo` in the components:
- `selectKpis`
- `selectAlerts`
- `selectDailySeries`
- `selectTopProducts`
- `selectByStatus`
- `selectProduct(sku)`
- `selectSummaryInput`, which builds what is sent to the AI

---

## 9. In-memory state (React Context + useReducer)

```ts
// state/reducer.ts  (pure)
export type State =
  | { readonly status: 'vacio' }
  | { readonly status: 'listo'; readonly data: StoreData; readonly resumen: AiSummary | null };

export type Action =
  | { readonly type: 'cargar'; readonly data: StoreData }
  | { readonly type: 'resumen'; readonly resumen: AiSummary }
  | { readonly type: 'reiniciar' };

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'cargar':    return { status: 'listo', data: action.data, resumen: null };
    case 'resumen':   return state.status === 'listo' ? { ...state, resumen: action.resumen } : state;
    case 'reiniciar': return { status: 'vacio' };
  }
};
```

- **`StoreProvider`** wraps the app in `app/layout.tsx`. The `useStore()` hook exposes `state` and `dispatch`.
- **Guard:** `app/(app)/layout.tsx` redirects to `/` if `status === 'vacio'`. If the page is reloaded, the data is lost and the user returns to the upload screen. This is the expected behavior: **no data is persisted**.
- **Derived metrics:** they are not stored in the state. They are computed with selectors, so the state contains only the source data.

---

## 10. Screens, routes and components

| # | Route | Main components | Data |
|---|---|---|---|
| 1 | `/` | `FileDrop`, "Probar con datos de ejemplo" button, steps and template | `useCsvUpload` → `dispatch('cargar')`; the example is downloaded from `/ejemplo-tienda.csv` |
| 2 | `/revision` | File card, counts, category chips and error notice | `data.productos`, `data.errores` |
| 3 | `/inicio` | `KpiCard` ×4, `AlertRow` ×2, `SalesChart`, `AiSummary`, `TopProducts` | Selectors and `useAiSummary` |
| 4 | `/inventario` | Search box, `Filters`, `ProductRow` with `StatusBadge` | `selectByStatus` and text filter (local state) |
| 5 | `/inventario/[sku]` | Days-until-stockout block, `VariantBars`, `WeeklyChart`, "Crear promo" button | `selectProduct(sku)`; the button links to `/promos?sku=...` |
| 6 | `/promos` | `PromoForm`: product, type, format and optional photo | Local form state |
| 7 | `/promos/resultado` | `PromoTemplate` + `QrCode`, `StylePicker`, `CopyBlock`, download and share | `usePromo` |

**Bottom bar (`BottomNav`):** Inicio · Inventario · Promos. The Trends tab from the mockups is removed.

**Required states on every screen:**
- **Loading:** shadcn skeletons.
- **Empty:** for example, a file with no sales shows only the inventory metrics.
- **Error:** a toast with a retry option.

---

## 11. Claude API integration

**Client.** It is the only instantiated object in the project, isolated in one file:

```ts
// lib/ai/client.ts  (server only)
import Anthropic from '@anthropic-ai/sdk';
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

**Generic function.** Calls Claude and validates the response:

```ts
// lib/ai/callClaude.ts
import type { ZodType } from 'zod';
import { anthropic } from './client';
import { err, ok, type Result } from '@/lib/fp/result';

export const callClaude = async <T>(opts: {
  model: string; system: string; user: string; schema: ZodType<T>; maxTokens: number;
}): Promise<Result<T>> => {
  try {
    const res = await anthropic.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    });
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    const parsed = opts.schema.safeParse(JSON.parse(text));
    return parsed.success ? ok(parsed.data) : err('La IA devolvió un formato inválido');
  } catch {
    return err('No se pudo contactar a la IA');
  }
};
```

### 11.1 `POST /api/resumen` (phase 1)

- **Proposed model:** `claude-haiku-5-5`.
- **Input:** the result of `selectSummaryInput`, never the full CSV. It includes:
  - KPIs and cutoff date;
  - up to 10 products about to sell out, with stock, daily sales rate and days until stockout;
  - up to 10 slow products, with stock and days without a sale;
  - the top 5 categories with their 7-day change.
- **Output (validated with zod):**

```ts
export const AiSummarySchema = z.object({
  recomendaciones: z.array(z.object({
    sku: z.string().nullable(),
    titulo: z.string().max(60),     // e.g. "Vestido floral midi"
    texto: z.string().max(160),     // e.g. "se agota en ~4 días al ritmo actual. Reponer talla M."
    accion: z.enum(['reponer', 'promocionar', 'liquidar', 'revisar']),
  })).min(1).max(3),
  datosInsuficientes: z.boolean(),
});
```

- **Prompt (system) rules:**
  - respond in Mexican Spanish;
  - use **only** the figures received and do not invent numbers;
  - a maximum of 3 recommendations;
  - set `datosInsuficientes: true` if there are not enough sales;
  - respond with JSON only.
- **In-memory cache:** the summary is stored in the state and is requested again only if another file is loaded.

### 11.2 `POST /api/promo` (phase 2)

- **Proposed model:** `claude-sonnet-5-5`.
- **Input:**
  - product, price and category;
  - promotion type (`descuento`, `2x1`, `novedad`, `ultimas_piezas`) and discount if applicable;
  - format (`1:1` or `9:16`);
  - chosen style.

  The photo is **not sent** in the first version.
- **Output:**

```ts
export const PromoSchema = z.object({
  titulo: z.string().max(40),          // "-20%"
  subtitulo: z.string().max(60),       // "en sudaderas"
  etiqueta: z.string().max(24),        // "Solo esta semana"
  paleta: z.object({ fondo: z.string(), texto: z.string(), acento: z.string() }), // hex
  copy: z.string().max(400),
  hashtags: z.array(z.string()).max(6),
});
```

- **Prices calculated by the app, not the AI.** The discounted price is computed in code (`precio * (1 - descuento)`) and drawn on the template. Claude does not write price figures, to avoid errors.
- **Contrast:** if the proposed palette does not have enough contrast, a predefined palette is used.

### 11.3 Security and limits

- The API key exists only on the server.
- Validate the request body size in the API route.
- Limit the length of texts coming from the CSV before sending them to the prompt.
- Treat product names as data, not as instructions.
- If Claude fails, the dashboard keeps working: only the AI block shows the error with a "Reintentar" button.

---

## 12. Promotion image generation (client)

1. **`PromoTemplate`** is a React component with a fixed size depending on the format (1080×1080 for a post, 1080×1920 for a story, scaled on screen). It receives Claude's content, the calculated price, the category emoji (or the uploaded photo) and the QR.
2. **`QrCode`:** a QR data URL is generated with the chosen library, in `lib/promo/qr.ts`.
3. **`toPng`:** converts the template node to PNG with `html-to-image`, in `lib/promo/toPng.ts`.
4. **Actions:**
   - **Download:** a link with `download`.
   - **Share:** `navigator.share({ files: [png] })` (Web Share API) when the browser supports it; otherwise it downloads.
   - **Copy text:** `navigator.clipboard.writeText`.
5. **Optional photo:** read with `URL.createObjectURL`, shown in the template and never sent to the server.

**Pending: the QR destination.** We need to decide where the code leads (product, store or WhatsApp) and where the URL comes from. Options: a `url_producto` column in the CSV or a "URL de tu tienda" field in the promotion form.

---

## 13. Styles

- **CSS Modules** for all own code: `Componente.module.css` next to each component.
- **shadcn theme file: `app/theme.css`.** A dedicated file to **paste a shadcn theme** exactly as shadcn's theme tools generate it: the `:root { … }` block and, if used, `.dark { … }`. It contains nothing else, so the theme can be replaced entirely without touching the rest. It starts with the mockup colors as a baseline:

```css
/* app/theme.css — paste the shadcn theme here (replace the whole file) */
:root {
  --background: #F6F5F1;
  --foreground: #17181C;
  --card: #FFFFFF;
  --card-foreground: #17181C;
  --primary: #0F5E50;
  --primary-foreground: #FFFFFF;
  --muted: #F1EFE8;
  --muted-foreground: #5A5C64;
  --border: #E4E2DA;
  --radius: 0.875rem;
  /* …remaining variables generated by shadcn */
}
```

- **Own tokens in `app/globals.css`.** This file imports `theme.css` and separately defines the StockIA colors that shadcn does not provide, so pasting a new theme does not erase them:

```css
/* app/globals.css */
@import './theme.css';

:root {
  --status-critico-bg: #FBE9DF;  --status-critico-fg: #9A3A0A;
  --status-lento-bg:   #FAF0D2;  --status-lento-fg:   #7A5A00;
  --status-sano-bg:    #E2F1E8;  --status-sano-fg:    #1F6B45;
}
```

- **Use from CSS Modules:** always with the variables (`color: var(--primary)`), never with hard-coded colors. This way, changing the theme in `theme.css` changes the whole app.

- **Typography:** Plus Jakarta Sans via `next/font/google`.
- **Basic *mobile-first* design, with a single layout:**
  - There are no different views per screen size: the same single-column layout scales.
  - The main container is fluid (`width: 100%`) with a maximum width (for example `max-width: 480px`) and is centered with `margin-inline: auto`. On desktop it looks the same as on mobile, centered.
  - Inner grids (KPI cards, paired buttons) use `grid-template-columns: repeat(2, minmax(0, 1fr))` and adapt on their own to the width, without media queries.
  - Media queries only if something breaks on very narrow screens.
  - Touch targets of at least 44 px.
- **Accessibility:**
  - status labels with text, not just color;
  - `aria-label` on icon-only buttons;
  - minimum contrast of 4.5:1.

---

## 14. Tests

Tests are written with **Vitest** and cover only the pure functions, which benefit the most from the functional approach:

- `categories.test.ts`: "Labial mate rojo" is classified as Belleza, "Botas de piel" as Calzado and "Kit misterioso" as Otros.
- `normalize.test.ts`: group by `sku`, rows with errors and products without sales.
- `metrics.test.ts`: days until stockout, 7- and 30-day windows, and division by zero.
- `status.test.ts`: the three statuses and the boundary cases of each threshold.

The full flow is tested by hand with `ejemplo-tienda.csv` and with an intentionally broken file.

---

## 15. Example data

`public/ejemplo-tienda.csv` contains the hypothetical store **"Casa Lupita"**. It is already generated (delivered together with this plan) with `scripts/generar_ejemplo.py`, which uses a fixed seed to always give the same result.

**Volume:**
- 2,152 rows;
- 67 SKUs (37 products with their variants) in 8 categories;
- 2,145 sale lines in 1,314 orders;
- 16 weeks of history, with a cutoff date of October 13, 2026.

**Results verified** with the formulas in section 8, computed with an independent script:

| Scenario | What the example shows |
|---|---|
| **KPIs** | 7-day sales: $96,697 (+11% vs. the previous week). 30-day sales: $384,527 (+10%). Stock: 1,006 units. Inventory value: $427,426 |
| **Popular** (units in 30 days) | Sudadera oversize 144 · Labial mate rojo 137 · Labial mate nude 69 · Vestido floral midi 54 · Chamarra acolchada 51 |
| **About to sell out** (≤ 7 days) | Tenis blancos talla 25 (**sold out**, with recent sales) · Vestido floral midi M (2 pieces, ~2.9 days) · Labial mate rojo (16 pieces, ~3.4 days) · Sudadera oversize in 4 variants (~3.6 to 7 days) · Chamarra acolchada M and L (~4.7 and 5.6 days) |
| **Upward trend** (last 3 weeks vs. the previous 3) | Chamarra acolchada +121% · Calaverita decorativa +110% · Café de olla +64% · Sudadera oversize +21% (cold season and Día de Muertos) |
| **Downward trend** | Blusa de lino −54% · Sandalias de piel −50% · Short de mezclilla −100% (end of summer) |
| **Problem products** (slow, 0 sales in 30 days) | Vela aromática lavanda: 38 pieces, 34 days without a sale · Audífonos inalámbricos: 12 pieces, 31 days · Bocina bluetooth negra: 22 pieces, 35 days · Short de mezclilla 28: 20 pieces, 44 days · Tarjeta de regalo: 99 pieces, never sold |
| **Best days** | Thursday and Sunday have more orders |
| **Discounts** | 273 lines with `precio_venta` lower than `precio` |
| **Classifier** | Food and "other" products come **without a category** to test classification by name |
| **Validation** | 6 rows with errors (rows 122, 372, 622, 872, 1122 and 1372): stock "N/A", quantity "dos", empty SKU, empty price, date "15/09/2026" and incomplete sale |

**Update the mockups.** The mockup figures were illustrative (for example, 124 products and 380 sales). With this file the app will show the values in the table.

`public/plantilla-tienda.csv` contains only the headers and 3 example rows.

---

## 16. Work plan

Each block leaves the app working. If time runs out, the last complete block is delivered.

### Phase 1: Inventory dashboard

- [ ] **Project base:**
  - `create-next-app` with TypeScript and App Router;
  - `shadcn init`;
  - install dependencies;
  - create `theme.css` and `globals.css`, the font, `providers.tsx` and `StoreProvider`;
  - deploy to Vercel from day one.
- [ ] **Data:**
  - domain types;
  - `parse` + `validate` + `normalize`;
  - classifier;
  - copy `ejemplo-tienda.csv` to `public/`;
  - tests with the expected results from section 15.
- [ ] **Metrics:** `metrics.ts`, `status.ts`, selectors and their tests.
- [ ] **Screens 1 and 2:** upload (including the example data) and review with errors.
- [ ] **Screen 3:** dashboard with KPIs, alerts, chart and best sellers, still without AI.
- [ ] **Screens 4 and 5:** inventory with filters and search, and product detail.
- [ ] **AI Summary:**
  - `callClaude`, schema and prompt;
  - `/api/resumen`;
  - `AiSummary` with loading, error and retry states.
- [ ] **Polish:** empty states, reload guard, `BottomNav` and accessibility review.
- [ ] ✅ **Milestone: phase 1 demo working on Vercel.**

### Phase 2: Promotions

- [ ] **Screen 6:** `PromoForm` with the product preselected from the detail screen (`?sku=`).
- [ ] **Promotion content:** `/api/promo` with its schema and prompt; discounted price calculated by the app.
- [ ] **Image:** `PromoTemplate` in 1:1 and 9:16, `StylePicker` and QR.
- [ ] **Export:** PNG, download, share and copy the text.
- [ ] **Screen 7:** loading, error and "Regenerar" states.
- [ ] ✅ **Milestone: full demo** (load example → dashboard → detail → create promo → share).

### Before the demo

- [ ] Rehearse the full flow with `ejemplo-tienda.csv`.
- [ ] Test with a broken CSV and with the Claude API down (invalid key) to show the error handling.
- [ ] Check the spending limit in the Claude API console.

---

## 17. Pending decisions

| Decision | Options | Recommendation |
|---|---|---|
| QR URL destination and source | Product, store or WhatsApp; column in the CSV or field in the form | "URL de tu tienda" field in the form, which does not change the CSV |
| QR library | `qrcode` or another | `qrcode` |
| Use zod, recharts and html-to-image | Yes or no | Yes: they cover validation, charts and export without writing them from scratch |
| Status thresholds | 7 days and 30 days, or others | Keep them as constants; already validated with the example |
