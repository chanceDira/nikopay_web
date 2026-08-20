# NikoPay

USDT in, RWF out via MTN Mobile Money. Sender wallet → NikoPay treasury → recipient MoMo.

| Piece | Value |
| --- | --- |
| App | Next.js (App Router) |
| DB | Hosted Supabase (Postgres) |
| Test chains | Base Sepolia (USDT ready), Polygon Amoy (token not wired yet) |
| MoMo | MTN Disbursements API (sandbox uses EUR) |
| Deploy | Vercel (`nikopay-mvp.vercel.app`) |

Never commit `.env.local`, service role keys, MoMo keys, or SMTP passwords.

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

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Publishable / anon key |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role. Never in the client |
| `NEXT_PUBLIC_SITE_URL` | Client + server | `http://localhost:3000` locally; production URL on Vercel |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Client | Reown / WalletConnect Cloud project id |
| `SETTLEMENT_INGEST_SECRET` | Server | Bearer token for deposit ingest and job routes |
| `ADMIN_SESSION_SECRET` | Server | Optional. Falls back to Supabase secret if unset |
| `CHAIN_RPC_URL_BASE` | Server | Prefer Alchemy/QuickNode. Public Sepolia RPC is rate-limited on Vercel |
| `CHAIN_RPC_URL_POLYGON` | Server | Optional until Polygon token is ready |

### MoMo sandbox

| Variable | Notes |
| --- | --- |
| `MOMO_BASE_URL` | `https://sandbox.momodeveloper.mtn.com` |
| `MOMO_TARGET_ENVIRONMENT` | `sandbox` |
| `MOMO_CURRENCY` | `EUR` in sandbox (not RWF) |
| `MOMO_DISBURSEMENT_SUBSCRIPTION_KEY` | Primary key from [MoMo developer profile](https://momodeveloper.mtn.com/) → Disbursements subscription. Do not regenerate just to reset balance |
| `MOMO_API_USER` | Sandbox API user UUID |
| `MOMO_API_KEY` | Sandbox API key for that user |
| `MOMO_CALLBACK_URL` | Optional production callback base, e.g. `https://your-host/api/momo/callback`. **Leave unset in sandbox.** Sandbox rejects the header when the URL host does not match the host used at API-user provision (common cause of `request_not_accepted` / `INVALID_CALLBACK_URL_HOST`). We poll status instead. |
| `MOMO_SANDBOX_PAYEE_MSISDN` | Use `46733123450` for successful sandbox disbursements |

### Email (optional)

Payout emails use Google SMTP (app password, not account password).

| Variable | Notes |
| --- | --- |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | App password |
| `EMAIL_FROM` | e.g. `NikoPay <you@gmail.com>` |

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

| Credential | What it is | Reset balance? |
| --- | --- | --- |
| Subscription primary key | Product access | No. Keep stable |
| API user | UUID “username” | Yes. Create a new one |
| API key | Password for that user | Yes. Created with the user |

You do **not** create a second developer portal account to get test funds.

### First-time API user

1. Subscribe to Disbursements. Copy the **primary** key into `MOMO_DISBURSEMENT_SUBSCRIPTION_KEY`.
2. Provision a sandbox user (portal Sandbox User Provisioning, or the app job below).
3. Set `MOMO_API_USER` and `MOMO_API_KEY`.
4. Set `MOMO_SANDBOX_PAYEE_MSISDN=46733123450`.
5. Restart / redeploy. Check **Admin → Treasury**. MTN disbursement balance should be non-zero (EUR).

### Callback URL (common failure)

If `MOMO_CALLBACK_URL` points at Vercel (e.g. `https://nikopay-mvp.vercel.app/...`) but the sandbox API user was created with another host (e.g. `nikopay.local`), MTN rejects the transfer. Status shows MoMo **Failed** with `request_not_accepted` (or `INVALID_CALLBACK_URL_HOST`).

**Fix for sandbox:** remove `MOMO_CALLBACK_URL` from env (local + Vercel), redeploy. The app skips the callback header in sandbox and polls transfer status.

### When treasury shows 0 EUR

Sandbox gives each API user a fake balance. Successful transfers drain it. At **0 EUR**, payouts fail (often low balance). There is no deposit button.

**Fix:** provision a **new** API user + API key, update only those two env vars, redeploy. Keep the subscription key.

```bash
curl -X POST "https://nikopay-mvp.vercel.app/api/jobs/momo/provision" \
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

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/jobs/momo/provision` | Create sandbox API user + key (sandbox only) |
| `POST` | `/api/jobs/payouts/run` | Run MoMo payouts for credited / pending intents |
| `POST` | `/api/jobs/payouts/run?intentId=<uuid>` | Run payout for one intent |
| `POST` | `/api/jobs/deposits/scan` | Scan chain for deposits |

Example payout run:

```bash
curl -X POST "http://localhost:3000/api/jobs/payouts/run" \
  -H "Authorization: Bearer YOUR_SETTLEMENT_INGEST_SECRET"
```

## Manual test path (happy path)

1. **Treasury:** Admin → Treasury. MTN balance > 0 EUR. Base USDT vault has liquidity (or you fund test USDT yourself).
2. **Pay:** `/app` → connect wallet (Base Sepolia) → enter amount → MoMo number → optional email → confirm transfer.
3. **Sandbox payee:** app may override payee to `MOMO_SANDBOX_PAYEE_MSISDN` (`46733123450`). Real Rwanda MSISDNs are for production later.
4. **Status:** `/app/payments/<id>`. Deposit should credit, then MoMo should move to successful.
5. **Admin:** Transactions, Payouts, Review. Failed MoMo shows `provider_reason` when MTN returns one.
6. **Email:** if the payer left an email and SMTP is set:
   - success → details + chain explorer link + MoMo refs
   - failure → only when MTN confirms FAILED/TIMEOUT (not on ambiguous local submit errors)

### What “paid” means

| Signal | Meaning |
| --- | --- |
| Intent `paid` + MoMo `successful` + provider ref | RWF path completed in sandbox terms |
| Intent `manual_review` + MoMo `failed` | USDT landed; MoMo did not. Ops retry / review |
| Intent `paid` but MoMo still `failed` | Usually an admin override. Trust MoMo transfer status for “did MoMo land?” |

Sandbox does not send real MoMo SMS. Watch the status page and admin payouts.

## Admin

| Path | Use |
| --- | --- |
| `/admin/login` | Wallet session (treasury wallet) |
| `/admin` | Overview |
| `/admin/transactions` | Intents |
| `/admin/review` | Manual review queue |
| `/admin/payouts` | MoMo transfers + provider reason |
| `/admin/treasury` | MoMo EUR balance + chain USDT vaults |
| `/admin/fx` | Rate / fee config |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Next.js |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run check` | Prettier check + ESLint + tests |
| `npm run fmt` / `npm run fmt:check` | Format |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run db:start` / `db:stop` / `db:reset` / `db:status` | Local Supabase |

## Layout

| Path | Role |
| --- | --- |
| `app/` | Routes, layouts, API handlers |
| `components/` | Landing, pay, admin, shared UI |
| `lib/` | Domain logic, MoMo, settlement, Supabase clients |
| `supabase/migrations/` | Schema migrations |

## Security basics

- Service role and MoMo secrets: server / Vercel env only
- Validate amounts and rates on the server; never trust client quotes for settlement
- Do not log emails, phones, tokens, or auth headers in production paths
- Render/Vercel filesystem is ephemeral; persist only in Supabase
