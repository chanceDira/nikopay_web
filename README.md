# NikoPay

USDT in, local mobile money out. Sender wallet → NikoPay treasury → recipient wallet via PawaPay.

| Piece       | Value                                                         |
| ----------- | ------------------------------------------------------------- |
| App         | Next.js (App Router)                                          |
| DB          | Hosted Supabase (Postgres)                                    |
| Test chains | Base Sepolia (USDT ready), Polygon Amoy (token not wired yet) |
| Payout rail | PawaPay Merchant API v2                                       |
| Deploy      | Vercel hosting, public site `https://nikopay.to`              |

Never commit `.env.local`, service role keys, PawaPay tokens, or SMTP passwords.

## Repository layout (canonical)

The Next.js app lives at the **repo root** (this is the `0xJ11` layout). Use this structure on every branch.

| Path                                         | Role                             |
| -------------------------------------------- | -------------------------------- |
| `app/`, `components/`, `lib/`                | Next.js App Router + UI + domain |
| `package.json`, `next.config.ts`, `proxy.ts` | App entry at repo root           |
| `supabase/`                                  | Migrations and DB config         |
| `contracts/`                                 | Foundry / on-chain helpers       |

Do **not** nest the app under `client/`. Vercel Root Directory must be `.` (repository root) so it can resolve `next` from root `package.json`. Preview on `0xJ11` and production on `main` must share this layout.

## Quick start

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` (see tables below). Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Pay flow: `/app`. Admin: `/admin`.

```bash
npm run check   # format + lint + unit tests
npm test
npm run build
```

## Environment variables

Copy from `.env.example`. Only `NEXT_PUBLIC_*` may reach the browser.

### Core

| Variable                                                                  | Where           | Notes                                                                                                                                         |
| ------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                                | Client + server | Project URL                                                                                                                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Publishable / anon key                                                                                                                        |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`                      | Server only     | Service role. Never in the client                                                                                                             |
| `NEXT_PUBLIC_SITE_URL`                                                    | Client + server | Local: `http://localhost:3000`. **Production: `https://nikopay.to`.** Used for OG/canonical; emails/sitemap skip localhost and `*.vercel.app` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`                                    | Client          | Reown / WalletConnect Cloud project id                                                                                                        |
| `SETTLEMENT_INGEST_SECRET`                                                | Server          | Bearer token for deposit ingest and job routes                                                                                                |
| `ADMIN_SESSION_SECRET`                                                    | Server          | Optional. Falls back to Supabase secret if unset                                                                                              |
| `CHAIN_RPC_URL_BASE`                                                      | Server          | Prefer Alchemy/QuickNode. Public Sepolia RPC is rate-limited on Vercel                                                                        |
| `CHAIN_RPC_URL_POLYGON`                                                   | Server          | Optional until Polygon token is ready                                                                                                         |

### PawaPay (payout rail)

Required for disbursements. Without `PAWAPAY_API_TOKEN`, payouts fail closed.

| Variable                   | Notes                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `PAWAPAY_BASE_URL`         | Sandbox: `https://api.sandbox.pawapay.io`. Production: `https://api.pawapay.io`        |
| `PAWAPAY_API_TOKEN`        | Bearer token from the matching PawaPay dashboard. Never commit                         |
| `PAWAPAY_CALLBACK_PATH`    | Default `/api/pawapay/callback`. Production: `https://nikopay.to/api/pawapay/callback` |
| `PAWAPAY_VERIFY_CALLBACKS` | Set `true` in production when signed callbacks are enabled                             |

### Email (optional)

Payout emails use Google SMTP (app password, not account password).

| Variable         | Notes                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SMTP_HOST`      | `smtp.gmail.com`                                                                                                                                                                              |
| `SMTP_PORT`      | `465`                                                                                                                                                                                         |
| `SMTP_SECURE`    | `true`                                                                                                                                                                                        |
| `SMTP_USER`      | Gmail address                                                                                                                                                                                 |
| `SMTP_PASS`      | App password                                                                                                                                                                                  |
| `EMAIL_FROM`     | e.g. `NikoPay <you@gmail.com>`                                                                                                                                                                |
| `EMAIL_SITE_URL` | Optional. Public https origin for email links. Prefer `https://nikopay.to`. If unset, uses a public `NEXT_PUBLIC_SITE_URL`, else `https://nikopay.to`. Never uses localhost or `*.vercel.app` |

If SMTP is unset, payouts still run. Emails are skipped.

### Vercel cutover (production)

On the Vercel project for `nikopay.to`:

1. Set `PAWAPAY_BASE_URL=https://api.pawapay.io`
2. Set production `PAWAPAY_API_TOKEN` (not the sandbox token)
3. Set `PAWAPAY_CALLBACK_PATH=/api/pawapay/callback` (or rely on default)
4. Register callback URL in PawaPay dashboard: `https://nikopay.to/api/pawapay/callback`
5. Set `PAWAPAY_VERIFY_CALLBACKS=true` when signed callbacks are enabled
6. Remove all `MOMO_*` and `PAYOUT_PROVIDER` env vars
7. Redeploy production

Preview may use sandbox `PAWAPAY_*` values. Do not put the production token on Preview.

On Vercel, set the same keys in project env and redeploy after PawaPay credential changes.

## Supabase

Hosted project is the system of record. Migrations live in `supabase/migrations/`.

Apply new SQL on the remote project (dashboard SQL, CLI, or team process). Example recent migrations:

- `07_intent_notify_email.sql` — optional notify email + `paid_notified_at`
- `08_momo_provider_reason.sql` — payout failure reason + `failed_notified_at`
- `10_intent_corridor.sql` — intent `country` / `currency` / `provider`

Local Supabase (optional):

```bash
npm run db:start
npm run db:status
npm run db:reset
npm run db:stop
```

## PawaPay sandbox setup

1. Create a PawaPay sandbox merchant account and API token.
2. Set `PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io` and `PAWAPAY_API_TOKEN` in `.env.local`.
3. Optional: leave `PAWAPAY_VERIFY_CALLBACKS=false` until signed callbacks are enabled; poll job still reconciles.
4. Restart `npm run dev`. Check **Admin → Treasury** for RWA RWF balance.
5. Top up the sandbox RWA wallet in the PawaPay dashboard before live payout tests.

Sandbox test MSISDNs are documented in PawaPay docs. NikoPay also maps a sandbox failure MSISDN override in `lib/pawapay/sandbox.ts` when predict-provider rejects the fixture.

## Job routes (ops)

All require `Authorization: Bearer <SETTLEMENT_INGEST_SECRET>`.

| Method | Path                                    | Purpose                                              |
| ------ | --------------------------------------- | ---------------------------------------------------- |
| `POST` | `/api/jobs/payouts/run`                 | Run PawaPay payouts for credited / pending intents   |
| `POST` | `/api/jobs/payouts/run?intentId=<uuid>` | Run payout for one intent                            |
| `POST` | `/api/jobs/pawapay/poll`                | Reconcile open `payout_transfers` via PawaPay lookup |
| `POST` | `/api/jobs/deposits/scan`               | Scan chain for deposits                              |

Example payout run:

```bash
curl -X POST "http://localhost:3000/api/jobs/payouts/run" \
  -H "Authorization: Bearer YOUR_SETTLEMENT_INGEST_SECRET"
```

## Manual test path (happy path)

1. **Treasury:** Admin → Treasury. PawaPay RWA RWF balance > 0. Base USDT vault has liquidity (or you fund test USDT yourself).
2. **Pay:** `/app` → connect wallet (Base Sepolia) → enter amount → mobile money number → optional email → confirm transfer.
3. **Status:** `/app/payments/<id>`. Deposit should credit, then payout should move to successful.
4. **Admin:** Transactions, Payouts, Review. Failed payouts show `provider_reason` when PawaPay returns one.
5. **Email:** if the payer left an email and SMTP is set:
   - success → details + chain explorer link + payout refs
   - failure → when the provider confirms failed (not on ambiguous local submit errors)

### What “paid” means

| Signal                                             | Meaning                                          |
| -------------------------------------------------- | ------------------------------------------------ |
| Intent `paid` + payout `successful` + provider ref | RWF path completed in sandbox terms              |
| Intent `manual_review` + payout `failed`           | USDT landed; payout did not. Ops retry / review  |
| Intent `payout_pending` + payout `enqueued`        | Provider accepted but not yet terminal; not paid |

Sandbox does not always send real mobile money SMS. Watch the status page and admin payouts.

## Admin

| Path                  | Use                                     |
| --------------------- | --------------------------------------- |
| `/admin/login`        | Wallet session (treasury wallet)        |
| `/admin`              | Overview                                |
| `/admin/transactions` | Intents                                 |
| `/admin/review`       | Manual review queue                     |
| `/admin/payouts`      | Payout transfers + provider reason      |
| `/admin/treasury`     | PawaPay RWF balance + chain USDT vaults |
| `/admin/fx`           | Rate / fee config                       |

## Scripts

| Command                                                   | Purpose                         |
| --------------------------------------------------------- | ------------------------------- |
| `npm run dev`                                             | Local Next.js                   |
| `npm run build` / `npm start`                             | Production build / serve        |
| `npm test` / `npm run test:watch`                         | Vitest                          |
| `npm run check`                                           | Prettier check + ESLint + tests |
| `npm run fmt` / `npm run fmt:check`                       | Format                          |
| `npm run lint` / `npm run lint:fix`                       | ESLint                          |
| `npm run db:start` / `db:stop` / `db:reset` / `db:status` | Local Supabase                  |

## SEO

Public discovery files:

| URL            | Source                                       |
| -------------- | -------------------------------------------- |
| `/robots.txt`  | `app/robots.ts`                              |
| `/sitemap.xml` | `app/sitemap.ts` (home, privacy, terms only) |

`/admin`, `/app`, `/auth`, and `/api` are disallowed in robots and marked `noindex`. After deploy, set `NEXT_PUBLIC_SITE_URL` to the production origin and submit the sitemap in Google Search Console.

## Layout

| Path                   | Role                                                |
| ---------------------- | --------------------------------------------------- |
| `app/`                 | Routes, layouts, API handlers                       |
| `components/`          | Landing, pay, admin, shared UI                      |
| `lib/`                 | Domain logic, PawaPay, settlement, Supabase clients |
| `supabase/migrations/` | Schema migrations                                   |

## Security basics

- Service role and PawaPay secrets: server / Vercel env only
- Validate amounts and rates on the server; never trust client quotes for settlement
- Do not log emails, phones, tokens, or auth headers in production paths
- Render/Vercel filesystem is ephemeral; persist only in Supabase
