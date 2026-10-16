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
- `app/` screens; `app/api/resumen` and `app/api/promo` are the only server code
- `app/theme.css` is the shadcn theme: replace it to re-skin the app. StockIA's own tokens (statuses, etc.) live in `app/globals.css`
