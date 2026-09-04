# NikoPay

USDT in, local mobile money out. Sender wallet → NikoPay treasury → recipient wallet (MTN MoMo today; PawaPay is the target rail).

| Piece       | Value                                                                 |
| ----------- | --------------------------------------------------------------------- |
| App         | Next.js (App Router)                                                  |
| DB          | Hosted Supabase (Postgres)                                            |
| Test chains | Base Sepolia (USDT ready), Polygon Amoy (token not wired yet)         |
| Payout rail | MTN MoMo Disbursements (live path). PawaPay v2 foundation in progress |
| Deploy      | Vercel hosting, public site `https://nikopay.to`                      |

Never commit `.env.local`, service role keys, MoMo/PawaPay tokens, or SMTP passwords.

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

### MoMo sandbox

| Variable                             | Notes                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MOMO_BASE_URL`                      | `https://sandbox.momodeveloper.mtn.com`                                                                                                                                                                                                                                                                    |
| `MOMO_TARGET_ENVIRONMENT`            | `sandbox`                                                                                                                                                                                                                                                                                                  |
| `MOMO_CURRENCY`                      | `EUR` in sandbox (not RWF)                                                                                                                                                                                                                                                                                 |
| `MOMO_DISBURSEMENT_SUBSCRIPTION_KEY` | Primary key from [MoMo developer profile](https://momodeveloper.mtn.com/) → Disbursements subscription. Do not regenerate just to reset balance                                                                                                                                                            |
| `MOMO_API_USER`                      | Sandbox API user UUID                                                                                                                                                                                                                                                                                      |
| `MOMO_API_KEY`                       | Sandbox API key for that user                                                                                                                                                                                                                                                                              |
| `MOMO_CALLBACK_URL`                  | Optional production callback base, e.g. `https://your-host/api/momo/callback`. **Leave unset in sandbox.** Sandbox rejects the header when the URL host does not match the host used at API-user provision (common cause of `request_not_accepted` / `INVALID_CALLBACK_URL_HOST`). We poll status instead. |
| `MOMO_SANDBOX_PAYEE_MSISDN`          | Sandbox payee override. Use `56733123453` for **success**. `46733123450` always fails (that is what caused `INTERNAL_PROCESSING_ERROR` on recent tests)                                                                                                                                                    |

### PawaPay (target rail)

Foundation through Phase B (`lib/pawapay`). Set `PAYOUT_PROVIDER=pawapay` locally **or on a Vercel Preview** to use the PawaPay orchestrator; keep production on `momo` until cutover.

| Variable                   | Notes                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `PAWAPAY_BASE_URL`         | Sandbox: `https://api.sandbox.pawapay.io`. Production: `https://api.pawapay.io`                 |
| `PAWAPAY_API_TOKEN`        | Bearer token from the matching PawaPay dashboard. Never commit                                  |
| `PAWAPAY_CALLBACK_PATH`    | Default `/api/pawapay/callback`. Production host: `https://nikopay.to`                          |
| `PAWAPAY_VERIFY_CALLBACKS` | Set `true` in production when signed callbacks are enabled                                      |
| `PAYOUT_PROVIDER`          | `momo` (default) or `pawapay`. Preview may use `pawapay`; production stays `momo` until cutover |

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

On Vercel, set the same keys in project env and redeploy after MoMo credential changes.

## Supabase

Hosted project is the system of record. Migrations live in `supabase/migrations/`.

Apply new SQL on the remote project (dashboard SQL, CLI, or team process). Example recent migrations:

- `07_intent_notify_email.sql` — optional notify email + `paid_notified_at`
- `08_momo_provider_reason.sql` — MTN failure reason + `failed_notified_at`

Local Supabase (optional):

```bash
npm run db:start
npm run db:status
npm run db:reset
npm run db:stop
```

## MoMo sandbox setup

You need one [momodeveloper.mtn.com](https://momodeveloper.mtn.com/) account with an active **Disbursements** subscription (product name can be anything, e.g. NIKOPAY).

### Credentials (three pieces)

| Credential               | What it is             | Reset balance?             |
| ------------------------ | ---------------------- | -------------------------- |
| Subscription primary key | Product access         | No. Keep stable            |
| API user                 | UUID “username”        | Yes. Create a new one      |
| API key                  | Password for that user | Yes. Created with the user |

You do **not** create a second developer portal account to get test funds.

### First-time API user

1. Subscribe to Disbursements. Copy the **primary** key into `MOMO_DISBURSEMENT_SUBSCRIPTION_KEY`.
2. Provision a sandbox user (portal Sandbox User Provisioning, or the app job below).
3. Set `MOMO_API_USER` and `MOMO_API_KEY`.
4. Set `MOMO_SANDBOX_PAYEE_MSISDN=56733123453` (success test number).

### Sandbox test MSISDNs

MTN maps these numbers to fixed outcomes in sandbox:

| MSISDN        | Outcome  |
| ------------- | -------- |
| `56733123453` | Success  |
| `46733123450` | Failed   |
| `46733123451` | Rejected |
| `46733123452` | Timeout  |
| `46733123454` | Pending  |

Do not use `46733123450` when you want a successful payout. It will fail with a reason like `INTERNAL_PROCESSING_ERROR` even when the disbursement balance is fine.

5. Restart / redeploy. Check **Admin → Treasury**. MTN disbursement balance should be non-zero (EUR).

### Callback URL (common failure)

If `MOMO_CALLBACK_URL` points at an old host (e.g. a Vercel alias) but the sandbox API user was created with another host (e.g. `nikopay.local`), MTN rejects the transfer. Status shows MoMo **Failed** with `request_not_accepted` (or `INVALID_CALLBACK_URL_HOST`).

**Fix for sandbox:** remove `MOMO_CALLBACK_URL` from env (local + Vercel), redeploy. The app skips the callback header in sandbox and polls transfer status.

**Production:** use `https://nikopay.to/api/momo/callback` (or leave unset only while still on sandbox).

### When treasury shows 0 EUR

Sandbox gives each API user a fake balance. Successful transfers drain it. At **0 EUR**, payouts fail (often low balance). There is no deposit button.

**Fix:** provision a **new** API user + API key, update only those two env vars, redeploy. Keep the subscription key.

```bash
curl -X POST "https://nikopay.to/api/jobs/momo/provision" \
  -H "Authorization: Bearer YOUR_SETTLEMENT_INGEST_SECRET"
```

Local:

```bash
curl -X POST "http://localhost:3000/api/jobs/momo/provision" \
  -H "Authorization: Bearer YOUR_SETTLEMENT_INGEST_SECRET"
```

Response includes `apiUser` and `apiKey`. Paste into env. Confirm Treasury balance before the next payout.

### Portal API Sandbox page looks empty

Open **Select API** on the left and pick Sandbox User Provisioning / Disbursements. Or skip the portal and use the provision curl above.

### Production MoMo (later)

Live Rwanda uses real float / pre-funding with MTN, not sandbox EUR. Currency and payee rules change. Do not use sandbox MSISDNs or EUR in production.

## Job routes (ops)

All require `Authorization: Bearer <SETTLEMENT_INGEST_SECRET>`.

| Method | Path                                    | Purpose                                         |
| ------ | --------------------------------------- | ----------------------------------------------- |
| `POST` | `/api/jobs/momo/provision`              | Create sandbox API user + key (sandbox only)    |
| `POST` | `/api/jobs/payouts/run`                 | Run MoMo payouts for credited / pending intents |
| `POST` | `/api/jobs/payouts/run?intentId=<uuid>` | Run payout for one intent                       |
| `POST` | `/api/jobs/deposits/scan`               | Scan chain for deposits                         |

Example payout run:

```bash
curl -X POST "http://localhost:3000/api/jobs/payouts/run" \
  -H "Authorization: Bearer YOUR_SETTLEMENT_INGEST_SECRET"
```

## Manual test path (happy path)

1. **Treasury:** Admin → Treasury. MTN balance > 0 EUR. Base USDT vault has liquidity (or you fund test USDT yourself).
2. **Pay:** `/app` → connect wallet (Base Sepolia) → enter amount → MoMo number → optional email → confirm transfer.
3. **Sandbox payee:** app overrides payee to `MOMO_SANDBOX_PAYEE_MSISDN`. Use `56733123453` for success. Real Rwanda MSISDNs are for production later.
4. **Status:** `/app/payments/<id>`. Deposit should credit, then MoMo should move to successful.
5. **Admin:** Transactions, Payouts, Review. Failed MoMo shows `provider_reason` when MTN returns one.
6. **Email:** if the payer left an email and SMTP is set:
   - success → details + chain explorer link + MoMo refs
   - failure → only when MTN confirms FAILED/TIMEOUT (not on ambiguous local submit errors)

### What “paid” means

| Signal                                           | Meaning                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| Intent `paid` + MoMo `successful` + provider ref | RWF path completed in sandbox terms                                        |
| Intent `manual_review` + MoMo `failed`           | USDT landed; MoMo did not. Ops retry / review                              |
| Intent `paid` but MoMo still `failed`            | Usually an admin override. Trust MoMo transfer status for “did MoMo land?” |

Sandbox does not send real MoMo SMS. Watch the status page and admin payouts.

## Admin

| Path                  | Use                                  |
| --------------------- | ------------------------------------ |
| `/admin/login`        | Wallet session (treasury wallet)     |
| `/admin`              | Overview                             |
| `/admin/transactions` | Intents                              |
| `/admin/review`       | Manual review queue                  |
| `/admin/payouts`      | MoMo transfers + provider reason     |
| `/admin/treasury`     | MoMo EUR balance + chain USDT vaults |
| `/admin/fx`           | Rate / fee config                    |

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

| Path                   | Role                                             |
| ---------------------- | ------------------------------------------------ |
| `app/`                 | Routes, layouts, API handlers                    |
| `components/`          | Landing, pay, admin, shared UI                   |
| `lib/`                 | Domain logic, MoMo, settlement, Supabase clients |
| `supabase/migrations/` | Schema migrations                                |

## Security basics

- Service role and MoMo secrets: server / Vercel env only
- Validate amounts and rates on the server; never trust client quotes for settlement
- Do not log emails, phones, tokens, or auth headers in production paths
- Render/Vercel filesystem is ephemeral; persist only in Supabase
