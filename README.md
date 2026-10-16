# StockIA

Prototype from `tech_plan.md` (mockups in `images/`): upload a Tiendanube CSV and get an inventory dashboard, alerts, an AI summary and AI-generated promotions. No database: data lives in memory for the session.

## Run

```bash
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm install
npm run dev                  # http://localhost:3000
npm test                     # vitest: CSV pipeline, metrics, statuses, classifier, promo helpers
```

Without an API key everything works except the AI blocks, which show an error with "Reintentar".

## Where things are

- `lib/` pure functions: `csv/` (parse → validate → normalize), `domain/` (classifier, metrics, statuses, AI summary input), `ai/` (Claude client, prompts, zod schemas), `promo/` (price, palette contrast, QR, PNG, share)
- `state/` reducer, context and selectors; `hooks/` effects (upload, AI calls)
- `app/` screens; `app/api/resumen`, `app/api/promo` and `app/api/chat` are the only server code
- Dashboard extras: retail-date countdown (`lib/domain/calendar.ts`), "¿Y si…?" scenarios (`lib/domain/whatif.ts` computes every number; `app/api/whatif` lets Claude pick and explain 5) and "Lo que se compra junto" (`lib/domain/basket.ts`, order co-occurrence with lift). The chat can query all three.
- Chat with the data (in the "Resumen IA" card): `app/api/chat` runs Claude with the SDK tool runner; its tools query per-product aggregates built by `lib/domain/insights.ts` (the CSV never leaves the browser)
- `app/theme.css` is the shadcn theme: replace it to re-skin the app. StockIA's own tokens (statuses, etc.) live in `app/globals.css`
