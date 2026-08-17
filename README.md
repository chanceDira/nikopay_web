# NikoPay

USDT in, RWF out via MTN Mobile Money. Sender wallet to NikoPay treasury to recipient MoMo.

Test chains: Polygon and Base. System of record: hosted Supabase (Postgres).

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` from the NikoPay Supabase project. Server keys stay there. Never commit that file.

```bash
npm run dev
```

## Scripts

- `npm run dev` local Next.js server
- `npm run check` format, lint, and unit tests
- `npm test` vitest
- `npm run build` production build

## Layout

- `app/` routes and API handlers
- `components/` landing, pay, admin, shared UI
- `lib/` domain logic and Supabase clients
- `supabase/migrations/` schema (CLI timestamps)

Public env is `NEXT_PUBLIC_*` only. Service role and MoMo keys never go in the client.
