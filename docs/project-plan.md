# NikoPay project plan

Comprehensive next-steps plan to complete the MVP and establish a foundation for later expansion.

Companion docs:
- Decisions and deferred inputs: [`docs/open-gaps.md`](./open-gaps.md)
- Two-month sprints: [`docs/sprint-plan.md`](./sprint-plan.md)
- Two-week presentation MVP: [`docs/presentation-sprint-plan.md`](./presentation-sprint-plan.md)
- UI-only collaborator plan: [`docs/ui-sprint-plan.md`](./ui-sprint-plan.md)
- Product TOR: `NikoPay - TOR.pdf` (repo root)

Last updated: 2026-08-10

---

## 1. Goal

Build a stablecoin settlement platform where a user pays USDT from an external wallet and a recipient receives FRW on MTN Mobile Money in Rwanda, with transparent rates/fees, tracking, receipts, treasury ops, and an admin console.

**Core path**

```text
User wallet (Polygon / Base)
  → USDT Transfer to NikoPay treasury
  → detect (~1s target, 3s OK)
  → credit payment intent in Supabase
  → MTN MoMo disbursement (FRW)
  → notify + receipt + ledger
```

**Not in MVP:** custodial wallet, exchange/trading, TRON launch, Airtel Money, MoMo→crypto on-ramp, merchant QR, payroll APIs.

---

## 2. Current state

| Area | Status |
|------|--------|
| Marketing landing | Done (Next.js 16, Tailwind, waitlist UI) |
| Waitlist API | Stub (validates email, no persistence) |
| Rates calculator | Mock constants in `lib/rates.ts` |
| Auth / Supabase | Not wired |
| Wallet connect | Copy only |
| Chain watch / indexer | Not started |
| Quotes / payments | Not started |
| MoMo client | Not started |
| Admin / treasury UI | Not started |
| Tests / CI | Not started |
| Legal pages | Placeholder `#` links |

---

## 3. Target architecture

```text
[User portal]     [Admin portal]     [Ops / treasury views]
       \                |                    /
        \               |                   /
         v              v                  v
              Next.js App Router
         (Server Actions / Route Handlers)
                      |
                      v
         Supabase (Auth + Postgres + RLS)
                      ^
                      |
     +----------------+----------------+
     |                                 |
[GraphQL indexer]              [Hot path webhooks]
 Transfer → treasury            ~1s credit signal
 Polygon + Base
     |                                 |
     +----------------+----------------+
                      |
                      v
              Settlement worker
                      |
                      v
           MTN MoMo Disbursements
              (sandbox → mtnrwanda)
```

**Systems of record**
- Supabase: payment intents, ledger, MoMo attempts, users, FX config, audit
- GraphQL indexer: queryable on-chain Transfer history
- Hot path push: settlement kickoff latency

---

## 4. Delivery phases

Work top-down. Later phases can start stubs earlier, but do not go live without phase gates.

### Phase 0. Foundations (now)

- [ ] Keep [`docs/open-gaps.md`](./open-gaps.md) current as decisions land
- [ ] Align landing copy with Polygon/Base testing (remove TRC20-first claims when product UI ships)
- [ ] Env template (names only, no secrets): Supabase, MoMo, RPC, treasury, site URL
- [ ] Folder conventions: `app/`, `components/`, `lib/`, `supabase/`, `docs/`
- [ ] Dependency policy: official registries only; audit before add; prefer thin MoMo client
- [ ] Lint/typecheck scripts ready for CI later
- [ ] README: real project overview (replace create-next-app boilerplate when scaffolding starts)

**Exit:** team can scaffold without inventing stack or security rules.

### Phase 1. Supabase foundation

- [ ] Init Supabase project + local CLI (`supabase/`)
- [ ] Clients: browser (anon/publishable) and server (service role) in `lib/supabase/`
- [ ] Base schema + migrations (see section 5)
- [ ] RLS policies for `anon` / `authenticated` / service paths
- [ ] Roles via `app_metadata` (not editable `user_metadata`)
- [ ] Seed: FX config row, chain/token allowlist stubs
- [ ] Wire waitlist to persist (optional early win)
- [ ] Generate TypeScript DB types

**Exit:** schema migrates cleanly; RLS verified; no secrets in git.

### Phase 2. Auth and app shells

- [ ] Supabase Auth (email magic link and/or OAuth as chosen)
- [ ] Session handling with `@supabase/ssr` patterns for Next.js 16
- [ ] Route groups: marketing `(marketing)`, app `(app)`, admin `(admin)`
- [ ] Protected layouts and middleware
- [ ] User profile basics (email, optional phone for MoMo)
- [ ] Admin gate (role check server-side + RLS)
- [ ] Sign-out, session refresh, secure cookies

**Exit:** authenticated user and admin can reach empty shells safely.

### Phase 3. Domain model and quote engine

- [ ] Payment intent lifecycle states (section 6)
- [ ] Server-side quote API: rate, spread, fee, net FRW, quote expiry
- [ ] Never trust client rates/fees/balances
- [ ] Admin-editable FX config in Supabase
- [ ] Amount limits (min/max USDT) and currency formatting
- [ ] Replace mock calculator with quote-backed estimates (still labeled until live FX)
- [ ] Idempotency keys on quote→intent creation

**Exit:** user can create a priced intent that expires correctly.

### Phase 4. User portal (pay flow UI)

- [ ] Connect wallet (WalletConnect / wagmi+viem; Polygon + Base)
- [ ] Chain switch + wrong-network handling
- [ ] Enter MoMo MSISDN (Rwanda format validation, normalize to `250…`)
- [ ] Validate MoMo account when API available (sandbox stub OK)
- [ ] Show quote breakdown before confirm
- [ ] Show treasury pay instructions (address, token, exact amount, chain, expiry)
- [ ] Payment status page (live updates)
- [ ] Transaction history list
- [ ] Receipt download (PDF or printable HTML)
- [ ] Error and expired-quote UX
- [ ] Mobile-responsive pay flow

**Exit:** full UX walkthrough works against stubs/mocks if chain/MoMo not live yet.

### Phase 5. Chain detection and GraphQL indexer

- [ ] Close P4 in gaps doc (concrete GraphQL stack)
- [ ] Index `Transfer` to treasury for allowlisted USDT contracts on Polygon + Base
- [ ] GraphQL schema for deposits (tx hash, log index, from, to, value, block, timestamp, chain)
- [ ] Hot path: webhook/subscription for ~1s detect (not poll-only GraphQL)
- [ ] Sync/upsert deposits into Supabase with unique `(chain_id, tx_hash, log_index)`
- [ ] Match deposit → payment intent (per P2 when decided; stub matcher meanwhile)
- [ ] Confirmation policy hooks (P1) with safe defaults documented
- [ ] Reorg handling: undo credit if unpaid; freeze/flag if MoMo already sent
- [ ] Backfill job for missed webhooks
- [ ] Testnet support (Polygon Amoy / Base Sepolia or current testnets)

**Exit:** test transfer is detected and linked to an intent within SLA band.

### Phase 6. Settlement engine

- [ ] State machine transitions with audit log
- [ ] Worker/queue or reliable cron/edge job to process `credited` → payout
- [ ] Cap and velocity checks (P7)
- [ ] MoMo transfer enqueue with UUID v4 reference = internal payout id
- [ ] Idempotent MoMo attempts (no double pay on retries)
- [ ] Handle MoMo `PENDING` / `SUCCESSFUL` / `FAILED`
- [ ] Callback route + status poll fallback
- [ ] Notify user (email and/or in-app) on terminal states
- [ ] Manual retry / fail paths for admin
- [ ] Reconciliation report: on-chain credited vs MoMo success vs ledger

**Exit:** sandbox USDT (or simulated credit) produces a MoMo sandbox disbursement and final status.

### Phase 7. MTN MoMo integration

- [ ] Thin first-party client: token, transfer, getStatus, validateAccountHolder
- [ ] Config: sandbox vs production hosts and `X-Target-Environment`
- [ ] Secrets via env only
- [ ] Callback signature/host validation as required
- [ ] MSISDN normalization and allowlist for sandbox test numbers
- [ ] Structured error mapping from MoMo codes
- [ ] Liquidity / balance check before large payouts (when API allows)
- [ ] Later: Rwanda go-live packet (D2), IP whitelist, live wallet float

**Exit:** sandbox transfer + status round-trip green; production left deferred until D2/D3.

### Phase 8. Treasury module

- [ ] Treasury wallet registry (per chain/token)
- [ ] On-chain balance snapshots (scheduled)
- [ ] MoMo float balance tracking (manual entry and/or API)
- [ ] Settlement calculation views
- [ ] Low-liquidity alerts
- [ ] Internal ledger: deposit, fee, payout, adjustment
- [ ] Exportable audit trail
- [ ] Ops runbook for top-up and incident freeze

**Exit:** ops can see crypto + MoMo liquidity and trace any payment.

### Phase 9. Admin portal

- [ ] Dashboard: volume, success rate, pending, failures
- [ ] User management (view, suspend)
- [ ] Transaction monitoring + detail drill-down
- [ ] Manual review / approve / reject queue
- [ ] FX rate and fee management
- [ ] Treasury balances
- [ ] Risk flags (velocity, mismatches, reorgs)
- [ ] Reporting exports (CSV)
- [ ] Admin audit log of privileged actions

**Exit:** single admin can operate MVP without SQL.

### Phase 10. Notifications and receipts

- [ ] Event types: quote created, deposit detected, credited, payout pending, paid, failed
- [ ] Channels: in-app status, email (provider TBD), optional SMS later
- [ ] Admin alerts: MoMo down, low float, webhook failures, reorg after pay
- [ ] Receipt content: ref, amounts, fees, rate, chain tx, MoMo ref, timestamps
- [ ] Idempotent notification sends

**Exit:** user and admin get reliable status signals.

### Phase 11. Security hardening

- [ ] RLS review on every exposed table
- [ ] Service role only on server
- [ ] Rate limits: waitlist, auth, quote, webhooks
- [ ] Webhook auth (HMAC / provider signatures)
- [ ] CSRF-safe cookie sessions
- [ ] No PII in logs (MSISDN, email, amounts redacted)
- [ ] Dependency audit before each new package
- [ ] Secrets rotation runbook
- [ ] Pentest checklist / advisor scans (Supabase advisors)
- [ ] Abuse caps and kill switch for payouts

**Exit:** security-pass skill checklist passes for MVP scope.

### Phase 12. Observability and reliability

- [ ] Structured server logs (safe fields only)
- [ ] Metrics: detect latency, payout latency, success/fail rates
- [ ] Alerting on error spikes and stuck `PENDING`
- [ ] Dead-letter handling for failed jobs
- [ ] Backup/restore verification (Supabase)
- [ ] Incident playbooks: double-pay risk, MoMo timeout, chain reorg

**Exit:** ops can diagnose a failed payment without guessing.

### Phase 13. Testing and QA

- [ ] Unit tests: quote math, MSISDN normalize, state transitions, matchers
- [ ] Integration tests: Supabase RLS, API routes, MoMo client (sandbox/mocked)
- [ ] E2E tests: pay flow UI (Playwright or similar, decide later)
- [ ] Chain fixture tests: sample Transfer logs → credit
- [ ] Load smoke on quote + webhook handlers
- [ ] QA scripts and checklists for UAT
- [ ] Regression suite before go-live

**Exit:** automated gates for critical money paths.

### Phase 14. Deploy and environments

- [ ] Environments: local, staging, production
- [ ] Hosting (Render or chosen platform): bind `0.0.0.0:$PORT`
- [ ] Ephemeral disk: no local persistence
- [ ] Env var matrix documented (names only in repo)
- [ ] Preview/staging Supabase project
- [ ] CI: lint, typecheck, test, migrate-check
- [ ] CD: migrate then deploy
- [ ] Domain, HTTPS, callback URLs
- [ ] Status page or health endpoints

**Exit:** staging runs full sandbox path; prod gated on credentials and compliance.

### Phase 15. Compliance, legal, go-live

- [ ] Privacy policy and terms pages (replace `#`)
- [ ] KYC/AML scope for MVP (D6)
- [ ] MTN Rwanda partner onboarding (D2)
- [ ] User disclosures: non-custodial-until-send, illustrative vs locked rates
- [ ] Support contacts and escalation
- [ ] Launch checklist and rollback plan
- [ ] Soft launch / waitlist invite flow

**Exit:** legal + partner + tech ready for first real payouts.

### Phase 16. TOR deliverables packaging

- [ ] Functional web application
- [ ] Administrative dashboard
- [ ] Wallet integration module
- [ ] Transaction processing engine
- [ ] Mobile Money payout integration
- [ ] Treasury management module
- [ ] Technical documentation
- [ ] Deployment documentation
- [ ] Source repository hygiene
- [ ] QA / test reports

**Exit:** TOR deliverable list checked off for MVP.

---

## 5. Data model (Supabase, initial)

Implement via migrations. Refine names as needed; keep concerns separate.

| Table | Purpose |
|-------|---------|
| `profiles` | User profile linked to `auth.users` |
| `admin_audit_logs` | Privileged action trail |
| `fx_rates` | Configurable USDT→RWF rate, spread, fee %, effective window |
| `chains` | Polygon, Base (ids, rpc labels, confirm policy) |
| `tokens` | Allowlisted contracts per chain |
| `treasury_wallets` | Receive addresses per chain/token |
| `waitlist_entries` | Early access emails |
| `payment_intents` | User quote + MoMo recipient + amounts + status |
| `chain_deposits` | Indexed Transfer events (unique chain/tx/log) |
| `intent_deposits` | Match intent ↔ deposit |
| `momo_transfers` | Disbursement attempts (UUID ref, status, raw refs) |
| `ledger_entries` | Double-entry style or append-only money events |
| `notifications` | Outbound notify log |
| `liquidity_snapshots` | Treasury crypto + MoMo float snapshots |

**Indexes:** status, created_at, msisdn hash/lookup as needed, deposit uniqueness, MoMo reference uniqueness.

**RLS sketch**
- Users read/write own intents (write limited to create/cancel where allowed)
- Users read own deposits/transfers/notifications
- Admin role read broader sets; mutations via server with audit
- Service role for workers/webhooks only on server

---

## 6. Payment intent states

```text
draft → quoted → awaiting_payment → detected → credited
  → payout_pending → paid
                 ↘ failed
                 ↘ manual_review
quoted/awaiting_payment → expired
credited/payout_* → manual_review (reorg, mismatch, MoMo uncertain)
```

Rules:
- Forward-only except explicit admin compensations
- Every transition writes an audit/ledger note when money-relevant
- MoMo reference UUID generated once per payout attempt; retries get new attempt rows or safe replay rules

---

## 7. API surface (initial)

Route handlers / server actions (names indicative):

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/waitlist` | Persist waitlist |
| POST | `/api/quotes` | Create server quote |
| POST | `/api/intents` | Create payment intent from quote |
| GET | `/api/intents/:id` | Status for owner |
| GET | `/api/intents` | History for owner |
| GET | `/api/intents/:id/receipt` | Receipt payload |
| POST | `/api/webhooks/chain` | Hot-path deposit events |
| POST | `/api/webhooks/momo` | MoMo callbacks |
| POST | `/api/admin/...` | Admin mutations (role-gated) |

Workers (not public):
- deposit matcher
- payout dispatcher
- status poller
- liquidity snapshotter
- notification sender

---

## 8. Frontend inventory

### Marketing (exists, extend, do not rebuild)
- Treat current landing as the solid marketing UI base
- Surgical updates only: Polygon/Base copy, FAQ/trust accuracy, calculator → server quote
- Reuse tokens/components for new app/admin surfaces
- Real privacy/terms routes (can stay light for presentation MVP)

### User app (build)
- Auth screens
- Dashboard / history
- New payment wizard
- Intent detail + status
- Receipt view
- Profile / MoMo number preferences

### Admin (build)
- Overview dashboard
- Transactions
- Users
- FX settings
- Treasury
- Risk / review queue
- Reports

### Shared UI
- Design tokens already in `globals.css`
- Form patterns from `waitlist-form.tsx`
- Consistent empty/loading/error states
- No em dashes; sentence case copy

---

## 9. Chain and indexer checklist

- [ ] Official token addresses (P3)
- [ ] Treasury addresses per env (D4)
- [ ] Confirmation policy (P1)
- [ ] Matching rules (P2)
- [ ] GraphQL indexer choice (P4)
- [ ] Webhook provider + secrets (D5)
- [ ] Testnet faucet / funding process
- [ ] Latency metrics vs 1s/3s target
- [ ] Reorg drills

---

## 10. MoMo checklist

Sandbox first:
- [ ] Portal signup + Disbursements product
- [ ] Subscription key, api user, api key
- [ ] Token → transfer → getStatus
- [ ] Callback URL host alignment
- [ ] Error code handling

Production later (deferred in gaps):
- [ ] Rwanda go-live form / KYC
- [ ] `X-Target-Environment: mtnrwanda`, currency `RWF`
- [ ] IP whitelist
- [ ] Live wallet float ops
- [ ] Fee schedule from MTN

---

## 11. Security checklist (ongoing)

- [ ] No secrets in client or git
- [ ] RLS enabled and tested
- [ ] Webhook authentication
- [ ] Idempotency on money endpoints
- [ ] Payout kill switch
- [ ] Dependency reviews (Sonatype / npm audit as available)
- [ ] Least-privilege Supabase keys
- [ ] Admin actions audited

---

## 12. Quality bar

- Low cognitive complexity; small modules
- Named exports; kebab-case files; `@/*` imports
- Minimal comments; no AI-like prose
- Server-trusted money math
- Match existing patterns before inventing
- Pre-ship: lint, build, security-pass, no agent files committed

---

## 13. Documentation to produce

| Doc | When |
|-----|------|
| `docs/open-gaps.md` | Living decisions |
| `docs/project-plan.md` (this file) | Living execution plan |
| `docs/architecture.md` | After phase 1–3 stabilize |
| `docs/api.md` | As routes land |
| `docs/runbook-ops.md` | Before staging money tests |
| `docs/deploy.md` | Before staging deploy |
| `README.md` | Replace boilerplate at scaffold start |
| Env example | Names only |

Agent-local rules/skills stay gitignored.

---

## 14. Future expansion (post-MVP)

Track only; do not build in MVP unless explicitly pulled in.

- MoMo → stablecoin on-ramp
- Merchant payments / QR
- Cross-border remittances
- Business payment APIs
- Stablecoin payroll
- Airtel Money
- USDC and additional chains
- East Africa regional expansion
- Bitcoin Lightning (TOR future list)

---

## 15. Suggested build order (practical)

Execute via [`docs/sprint-plan.md`](./sprint-plan.md) (8 one-week sprints over 2 months).

1. Phase 0 leftovers + this plan kept current  
2. Phase 1 schema + clients (no secrets committed)  
3. Phase 2 auth shells  
4. Phase 3 quotes + intents  
5. Phase 4 user pay UI against stubs  
6. Phase 5 indexer + webhooks  
7. Phase 6–7 settlement + MoMo sandbox  
8. Phase 8–9 treasury + admin  
9. Phase 10–13 notify, security, observability, tests  
10. Phase 14–16 staging, compliance, TOR packaging, go-live  

---

## 16. Definition of done (MVP)

MVP is done when all of the following are true in staging (and prod when credentials/compliance allow):

1. User can authenticate, get a quote, and create an intent.  
2. User can pay allowlisted USDT on Polygon or Base to treasury.  
3. Deposit is detected within the 1s target / 3s OK band under normal conditions.  
4. Intent is credited and MoMo disbursement is attempted idempotently.  
5. User sees final status and can access a receipt.  
6. Admin can monitor, adjust FX, review failures, and see treasury liquidity.  
7. Ledger reconciles on-chain credit, fees, and MoMo outcomes.  
8. Security baseline (RLS, secrets, webhook auth, caps) is in place.  
9. Deploy docs and ops runbook exist.  
10. Open critical gaps for go-live are closed or explicitly accepted.

---

## 17. Immediate next actions

For the **presentation in ~2 weeks**, execute [`docs/presentation-sprint-plan.md`](./presentation-sprint-plan.md) first: a **working E2E MVP** (testnet + MoMo sandbox), narrow scope, not a fake path.

Then continue full delivery via [`docs/sprint-plan.md`](./sprint-plan.md).

When ready to write code:

1. Supabase + auth + quote/intent APIs  
2. Pay wizard with real treasury instructions  
3. Chain deposit detect on Polygon/Base testnet  
4. MoMo sandbox disbursement + receipt  
5. Thin admin + preview deploy + rehearsal  

Supply D1/D3/D4/D5 early; contingencies exist but the MVP definition stays real E2E.
