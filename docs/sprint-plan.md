# NikoPay sprint plan (2 months)

Eight one-week sprints covering the full MVP in [`docs/project-plan.md`](./project-plan.md) with no uncovered work.

Companions:
- [`docs/open-gaps.md`](./open-gaps.md)
- Two-week presentation MVP: [`docs/presentation-sprint-plan.md`](./presentation-sprint-plan.md)

Calendar assumption: **Week 1 starts 2026-08-11**. Shift dates if kickoff moves; keep order and dependencies.

| Month | Sprints | Dates (assumed) | Theme |
|-------|---------|-----------------|-------|
| Month 1 | S1–S4 | Aug 11 → Sep 7 | Foundation, auth, quotes, pay UI, chain detect start |
| Month 2 | S5–S8 | Sep 8 → Oct 5 | Settlement, MoMo, treasury, admin, harden, ship staging |

---

## Working agreements

- Each sprint has one primary demoable outcome.
- Treat the existing landing as a solid UI base: extend copy/wiring; do not full-refactor it.
- Money paths always ship with tests in the same sprint they land.
- Stubs are allowed when credentials (D1–D5) are missing; replace stubs the sprint after creds arrive without skipping features.
- P1–P4 stay open until you decide; sprints use documented safe defaults and swap when decisions land.
- No sprint ends with broken `main`/`develop`/`0xJ11` build: lint + typecheck + build must pass.
- Agent tooling stays gitignored; docs in `docs/` are commit-able.
- Every project-plan phase item maps to at least one sprint (see coverage matrix).

### Tracks (parallel inside each sprint)

| Track | Owns |
|-------|------|
| A. Platform | Supabase, auth, RLS, workers, APIs |
| B. Product UI | Landing, user app, admin UI |
| C. Rails | Chain indexer, webhooks, MoMo, settlement |
| D. Quality | Tests, security, observability, docs, deploy |

---

## Coverage matrix (no gaps)

Every project-plan phase is assigned. Cross-cutting items repeat where needed.

| Plan phase | Primary sprint(s) | Follow-up |
|------------|-------------------|-----------|
| 0 Foundations | S1 | README polish S1; copy updates S3/S4 |
| 1 Supabase foundation | S1 | Types regen as schema evolves S2–S6 |
| 2 Auth and app shells | S2 | Session edge cases S7 |
| 3 Domain + quote engine | S2–S3 | FX admin UI S6 |
| 4 User portal pay flow | S3–S4 | Live status polish S5; receipts S6 |
| 5 Chain + GraphQL indexer | S4–S5 | Latency/reorg harden S7 |
| 6 Settlement engine | S5–S6 | Reconciliation polish S7 |
| 7 MoMo integration | S5–S6 | Prod packet deferred (D2) post-MVP gate |
| 8 Treasury module | S6–S7 | Alerts S7 |
| 9 Admin portal | S6–S7 | Reports polish S8 |
| 10 Notifications + receipts | S6 | Admin alerts S7 |
| 11 Security hardening | S1 (baseline), S7 (full pass) | Ongoing each sprint |
| 12 Observability | S7 | Health checks S8 |
| 13 Testing and QA | S2+ continuous; peak S7–S8 | UAT S8 |
| 14 Deploy and environments | S2 (CI start), S7–S8 (staging) | Prod gated on D2/D6 |
| 15 Compliance / legal | S7–S8 | Live MoMo partner outside pure code |
| 16 TOR packaging | S8 | Final checklist |

---

## Safe defaults while gaps are open

Use until you close P1–P4 / supply D*:

| Gap | Default for sprints |
|-----|---------------------|
| P1 | Base: 1 sealed L2 block. Polygon: 2 blocks. Configurable in `chains` |
| P2 | Exact amount match within tolerance from P6 default; single treasury address |
| P3 | Placeholder token rows in DB; env overrides for addresses |
| P4 | GraphQL subgraph schema designed S4; implement chosen stack S4–S5 when picked |
| P5 | UI: "Payment recognized" for 1s messaging |
| P6 | Quote TTL 10 minutes; amount tolerance 0 |
| P7 | Per-tx max + daily velocity in `fx_rates` / config table; admin editable |
| P8 | Roles: `user`, `admin` in `app_metadata` |
| D1–D5 | Local stubs / mocks; interface-stable so wiring is swap-in |

---

# Sprint 1. Platform foundation

**Dates:** Aug 11–17  
**Goal:** Repo is ready to build money features on Supabase-shaped foundations.  
**Maps to:** Phase 0, Phase 1 (start), Phase 11 baseline, Phase 13 harness start

### Track A
- [ ] Init `supabase/` (config, first migration)
- [ ] Migrations for all core tables from project plan §5 (can be additive; empty RLS first then policies)
- [ ] RLS policies v1 for profiles, waitlist, fx_rates, chains, tokens, treasury_wallets
- [ ] Seed: Polygon + Base chain rows, stub tokens, stub fx_rates, stub treasury wallets
- [ ] `lib/supabase/server.ts` + `lib/supabase/client.ts` (env-driven; no secrets committed)
- [ ] Persist waitlist to `waitlist_entries`
- [ ] Generate DB TypeScript types pipeline

### Track B
- [ ] Replace README boilerplate with NikoPay overview + local setup
- [ ] Add `.env.example` (names only)
- [ ] Route group scaffolding: `(marketing)`, `(app)`, `(admin)` shells (empty pages OK)
- [ ] Landing: note Polygon/Base as testing chains in FAQ/trust where TRC20-first today

### Track C
- [ ] Scaffold `lib/momo/` client interface (token, transfer, getStatus, validate) with sandbox URL constants; mock implementation
- [ ] Scaffold `lib/chain/` types (chain id, token, deposit event)
- [ ] Scaffold `lib/settlement/` intent status union + pure transition helpers (no DB yet)

### Track D
- [ ] `npm` scripts: `lint`, `typecheck`, `test` (vitest or project-chosen runner)
- [ ] First unit tests for intent transitions + MSISDN normalize stub
- [ ] Dependency audit process note in README; add only audited packages
- [ ] Confirm `.gitignore` still blocks `.cursor/`, `AGENTS.md`, `CLAUDE.md`, `.env*`

### Sprint 1 acceptance
- Migrations apply locally (or against provided Supabase when D1 arrives)
- Waitlist writes to DB when configured; clear error when env missing
- Build + lint + typecheck green
- No secrets in git

### Needs from you
- D1 helpful but not blocking (local Supabase CLI works without cloud)

---

# Sprint 2. Auth, profiles, quote core

**Dates:** Aug 18–24  
**Goal:** Users can sign in; server issues trusted quotes.  
**Maps to:** Phase 2, Phase 3 (start), Phase 14 CI start

### Track A
- [ ] Supabase Auth (magic link default; OAuth optional if easy)
- [ ] Next.js 16 SSR session helpers (`@supabase/ssr` per current docs)
- [ ] Middleware: protect `(app)` and `(admin)`
- [ ] `profiles` create-on-signup trigger
- [ ] Admin role check helper (`app_metadata.role = admin`)
- [ ] `POST /api/quotes` (rate, spread, fee, net, expiry) reading `fx_rates`
- [ ] Quote idempotency / expiry fields
- [ ] RLS: users cannot update FX; admins via server only for now

### Track B
- [ ] Auth UI: sign-in, sign-out, session expired
- [ ] App shell nav (history, new payment placeholder, profile)
- [ ] Admin shell nav (empty sections linked)
- [ ] Profile page: email, preferred MoMo MSISDN field (stored normalized)

### Track C
- [ ] Domain module: quote calculation pure functions + tests
- [ ] Amount min/max from config
- [ ] Formatters for USDT/RWF reused by API and UI

### Track D
- [ ] CI workflow: lint, typecheck, unit tests on PR
- [ ] Integration test skeleton for quote API (mocked Supabase if needed)
- [ ] `docs/architecture.md` draft (auth + quote)

### Sprint 2 acceptance
- Unauthenticated users blocked from app/admin
- Authenticated user gets a server quote that matches DB fx config
- Admin user reaches admin shell; normal user gets 403
- CI green on PR

### Needs from you
- D1 for hosted auth email delivery; local Inbucket/Supabase local OK otherwise
- P6/P8 defaults used unless you decide earlier

---

# Sprint 3. Intents + pay wizard (UI complete against stubs)

**Dates:** Aug 25–31  
**Goal:** Full user pay UX creating real intents; chain/MoMo still stubbed.  
**Maps to:** Phase 3 (finish), Phase 4 (majority)

### Track A
- [ ] `POST /api/intents` from quote; state `awaiting_payment`
- [ ] `GET /api/intents`, `GET /api/intents/:id`
- [ ] Expiry job/cron or on-read expiry transition to `expired`
- [ ] RLS: users CRUD/read own intents only (create/cancel rules)
- [ ] Ledger stub entry on intent create (optional) or prepare ledger writer

### Track B
- [ ] Payment wizard steps: amount → MoMo number → review quote → pay instructions
- [ ] MSISDN validation UX (Rwanda `2507…`)
- [ ] Pay instructions screen: chain, token, treasury address, exact USDT, countdown
- [ ] Intent detail/status page (poll or realtime subscription on intent row)
- [ ] History list
- [ ] Wallet connect UI wired (wagmi/viem) for Polygon + Base; send can be manual copy-address if send UX slips
- [ ] Wrong-network banner
- [ ] Mobile-responsive pass on wizard

### Track C
- [ ] Wallet config module: chain ids, RPC env names, token decimals helpers
- [ ] Optional: "simulate deposit" admin/dev-only endpoint for UI testing without chain

### Track D
- [ ] E2E smoke: auth → quote → intent (Playwright or equivalent)
- [ ] Unit tests: MSISDN normalize, expiry
- [ ] Update landing calculator to call quote API (labeled estimate)

### Sprint 3 acceptance
- User completes wizard and sees awaiting_payment instructions
- Intent appears in history and detail
- Expired quotes/intents cannot be paid
- E2E smoke green

### Needs from you
- WalletConnect project id when wallet send is enabled (can use env placeholder)

---

# Sprint 4. Chain indexer + hot-path detect

**Dates:** Sep 1–7  
**Goal:** On-chain USDT transfers to treasury are detected and matched to intents.  
**Maps to:** Phase 5 (start/majority), Phase 4 wallet send polish

### Track A
- [ ] `chain_deposits` + `intent_deposits` fully wired
- [ ] `POST /api/webhooks/chain` with signature verification stub → real when D5 lands
- [ ] Idempotent upsert on `(chain_id, tx_hash, log_index)`
- [ ] Matcher service: deposit → open intent (safe default P2)
- [ ] Status: `detected` → `credited` per confirmation policy default (P1)
- [ ] Reorg flag column + transition to `manual_review` if credited deposit disappears before payout

### Track B
- [ ] Status page shows detected/credited with tx link (explorer URL)
- [ ] Finish wallet send UX if not done in S3
- [ ] Copy: "Payment recognized" messaging (P5 default)

### Track C
- [ ] GraphQL schema for deposits (subgraph/Envio/Goldsky-shaped)
- [ ] Implement chosen indexer stack (P4) or reference subgraph + sync worker
- [ ] Hot-path webhook/stream subscription for treasury Transfer
- [ ] Backfill job from GraphQL → Supabase
- [ ] Testnet config (Amoy / Base Sepolia or current)
- [ ] Latency metric log: webhook received_at − block_timestamp

### Track D
- [ ] Fixture tests: sample ERC-20 Transfer log → credit
- [ ] `docs/api.md` webhook + intent sections
- [ ] Security: webhook auth required in staging config

### Sprint 4 acceptance
- Testnet (or simulated) Transfer credits a matching intent within 3s OK band; aim 1s on Base
- Duplicate webhook does not double-credit
- GraphQL can query deposit history for treasury

### Needs from you (ideal this week)
- P4 indexer choice
- D4 treasury addresses (testnet OK)
- D5 RPC/webhook keys
- P1/P2/P3 if ready; else defaults

**Month 1 checkpoint:** User can auth, quote, create intent, pay (or simulate), get credited in Supabase.

---

# Sprint 5. MoMo client + settlement engine

**Dates:** Sep 8–14  
**Goal:** Credited intents disburse FRW via MoMo sandbox (or full mock if D3 late).  
**Maps to:** Phase 6, Phase 7

### Track A
- [ ] `momo_transfers` attempts table + unique UUID reference
- [ ] Payout worker: `credited` → `payout_pending` → terminal states
- [ ] Caps/velocity checks (P7 defaults)
- [ ] Kill switch config flag
- [ ] MoMo callback route `/api/webhooks/momo`
- [ ] Status poller fallback for PENDING
- [ ] Ledger entries: deposit credit, fee, payout
- [ ] Admin manual retry / mark failed (API)

### Track B
- [ ] User status: payout pending / paid / failed
- [ ] Failure reason generic to user; detail admin-only
- [ ] In-app notification list (basic)

### Track C
- [ ] Real thin MoMo `fetch` client (sandbox)
- [ ] validateAccountHolder integration in wizard when D3 present
- [ ] Error mapping from MoMo codes
- [ ] Sandbox MSISDN allowlist config
- [ ] If D3 missing: deterministic mock MoMo that still exercises state machine

### Track D
- [ ] Integration tests: credit → mock/sandbox MoMo → paid
- [ ] Idempotency tests: retry does not double-pay
- [ ] No PII in log assertions

### Sprint 5 acceptance
- Credited intent reaches `paid` or `failed` through engine
- Callback + poll paths both covered by tests
- Double-submit safe

### Needs from you
- D3 MoMo sandbox credentials (strongly preferred this week)

---

# Sprint 6. Treasury + admin + receipts

**Dates:** Sep 15–21  
**Goal:** Ops can run the MVP without SQL; users get receipts.  
**Maps to:** Phase 8, Phase 9, Phase 10

### Track A
- [ ] Liquidity snapshots job (on-chain balances + MoMo balance API or manual)
- [ ] Low-liquidity threshold config + alert rows
- [ ] Admin APIs: list intents, force review, update FX, suspend user, export CSV
- [ ] `admin_audit_logs` on every privileged mutation
- [ ] Reconciliation view query: deposits vs momo vs ledger

### Track B
- [ ] Admin dashboard: volume, success rate, pending, failures
- [ ] Admin transactions table + detail drawer
- [ ] Manual review queue UI
- [ ] FX settings UI
- [ ] Users list + suspend
- [ ] Treasury page: wallets, balances, snapshots
- [ ] Risk flags list
- [ ] User receipt page + printable/PDF export
- [ ] Email notify on paid/failed (provider stub OK)

### Track C
- [ ] Explorer links + MoMo external ids on detail views
- [ ] Settlement calculation helpers for admin

### Track D
- [ ] Admin RLS/role tests
- [ ] Receipt content checklist test
- [ ] `docs/runbook-ops.md` draft (freeze payouts, top up float, reorg)

### Sprint 6 acceptance
- Admin completes: change FX → see new quotes; review a failed tx; see treasury balances
- User downloads receipt for paid intent
- Audit log shows admin actions

---

# Sprint 7. Harden, observe, deploy staging

**Dates:** Sep 22–28  
**Goal:** Staging runs the full sandbox path; security and ops ready.  
**Maps to:** Phase 11, Phase 12, Phase 13 (peak), Phase 14, Phase 15 start

### Track A
- [ ] Full RLS review on every table
- [ ] Rate limits: waitlist, auth, quotes, webhooks
- [ ] Webhook HMAC/signature enforcement (fail closed in staging)
- [ ] Structured logging (redaction helpers)
- [ ] Metrics: detect latency, payout latency, success/fail
- [ ] Dead-letter / stuck PENDING alerter
- [ ] Backup/restore verification notes for Supabase

### Track B
- [ ] Privacy + Terms pages (replace `#`)
- [ ] In-product disclosures (rate lock, non-custodial-until-send)
- [ ] Support contact page / footer real links
- [ ] Empty/error state polish across app + admin
- [ ] Accessibility pass on pay wizard and admin tables

### Track C
- [ ] Reorg drill documented and tested
- [ ] Latency report vs 1s/3s target
- [ ] MoMo timeout uncertain-state → manual_review path proven
- [ ] Indexer backfill under failure injection

### Track D
- [ ] Staging deploy (Render or chosen): `0.0.0.0:$PORT`
- [ ] Staging env matrix; migrate-then-deploy
- [ ] Health endpoints
- [ ] Supabase advisors / security checklist
- [ ] Load smoke: quote + webhook handlers
- [ ] E2E suite against staging
- [ ] `docs/deploy.md`, expand `docs/runbook-ops.md`
- [ ] Incident playbooks: double-pay, MoMo timeout, reorg after pay
- [ ] Dependency audit freeze for release candidates

### Sprint 7 acceptance
- Staging: auth → quote → pay/simulate → credit → MoMo sandbox/mock → paid → receipt
- Security-pass checklist complete for MVP
- Ops can follow runbook without engineer tribal knowledge

### Needs from you
- D7 hosting choice + domains
- D6 KYC scope input for legal copy accuracy
- Any remaining P1–P4 decisions for production config

---

# Sprint 8. UAT, TOR packaging, soft-launch ready

**Dates:** Sep 29 – Oct 5  
**Goal:** MVP definition of done met on staging; TOR deliverables packaged; soft-launch gate clear.  
**Maps to:** Phase 13 finish, Phase 15, Phase 16, residual polish

### Track A
- [ ] Fix UAT defects (P0/P1 only; P2 backlog)
- [ ] Final reconciliation report + CSV exports verified
- [ ] Production config templates ready (still no prod cutover without D2)
- [ ] Feature flags for payout kill switch documented

### Track B
- [ ] Soft-launch / invite-only waitlist → app access flow
- [ ] Marketing copy final pass (Polygon/Base, no em dashes, sentence case)
- [ ] Admin reports polish
- [ ] User history/receipt final UX

### Track C
- [ ] End-to-end testnet payment recorded as evidence (screenshots + tx hashes)
- [ ] MoMo sandbox evidence pack
- [ ] Performance notes for detect SLA

### Track D
- [ ] UAT checklist executed and signed off
- [ ] QA report (`docs/qa-report.md`)
- [ ] Technical docs complete: architecture, api, deploy, runbook
- [ ] TOR deliverables checklist ticked in project plan §16
- [ ] Regression suite green
- [ ] Go-live checklist + rollback plan
- [ ] Explicit list of accepted risks / remaining deferred gaps (D2 prod MoMo, etc.)

### Sprint 8 acceptance (MVP done on staging)
Matches project-plan definition of done:

1. Auth + quote + intent  
2. USDT pay on Polygon or Base (testnet OK)  
3. Detect within SLA band  
4. Idempotent MoMo disbursement path  
5. Status + receipt  
6. Admin operate without SQL  
7. Ledger reconciles  
8. Security baseline  
9. Deploy + ops docs  
10. Gaps closed or explicitly accepted  

**Production live payouts** remain gated on D2/D3-prod/D6; staging MVP is the 2-month code finish line.

---

## Cross-sprint backlog (must not be dropped)

These are woven above; listed here so nothing silent:

| Item | Sprints |
|------|---------|
| Waitlist persistence | S1 |
| Env example + README | S1 |
| CI | S2, expand S7 |
| Landing chain copy | S1, final S8 |
| Wallet connect Polygon/Base | S3–S4 |
| GraphQL indexer + webhook hot path | S4–S5 |
| MoMo thin client | S5 |
| Settlement state machine | S5–S6 |
| Treasury + ledger | S5–S6 |
| Admin full console | S6–S7 |
| Notifications + receipts | S6 |
| Privacy/Terms | S7 |
| Rate limits + webhook auth | S7 |
| Observability + runbooks | S7 |
| Staging deploy | S7–S8 |
| UAT + TOR packaging | S8 |
| Security review each money PR | S3–S8 |
| Tests with every money feature | S2–S8 |

---

## Dependency timeline (inputs)

| When needed | Input | If late |
|-------------|-------|---------|
| S1–S2 | D1 Supabase | Local Supabase CLI |
| S3 | WalletConnect project id | Copy-address pay instructions |
| S4 | P4, D4, D5 (P1–P3 nice) | Defaults + simulate deposit |
| S5 | D3 MoMo sandbox | Full MoMo mock preserving states |
| S7 | D7 hosting | Delay staging host; keep local e2e |
| S8 | D6 legal/KYC scope | Generic disclosures; flag accepted risk |
| Post-MVP | D2 Rwanda prod MoMo | No real FRW until then |

---

## Capacity notes

- Plan assumes a focused full-stack effort (you + agent/engineering) each week.
- If capacity is lower, slip order is: polish → admin reports → email provider → PDF receipts (keep printable HTML) → never slip settlement safety or idempotency.
- Do not skip S7 hardening to "finish features" in S8.

---

## Rituals

| Cadence | Action |
|---------|--------|
| Sprint start | Confirm goal, blockers from gaps doc, stub vs live creds |
| Mid-week | Demo vertical slice; adjust only inside sprint scope |
| Sprint end | Acceptance checklist, update open-gaps + this file if slipped |
| Month 1 end (S4) | Checkpoint demo: credited intent from chain/sim |
| Month 2 end (S8) | Staging MVP + TOR pack |

---

## Slip protocol

If a sprint misses acceptance:

1. Move only incomplete acceptance items to next sprint top.  
2. Do not silently delete coverage matrix rows.  
3. Cut polish before cutting money safety.  
4. Record slip reason in this file under a "Change log" section.

### Change log

| Date | Change |
|------|--------|
| 2026-08-10 | Initial 8-sprint / 2-month plan created |
