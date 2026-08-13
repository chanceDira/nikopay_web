# NikoPay presentation MVP sprints (2 weeks)

Goal: ship a **working end-to-end MVP** in two weeks for presentation. Same product as the TOR (USDT in → FRW out on MTN MoMo). MVP means **narrow scope and short timeline**, not a fake or click-demo that skips real settlement steps.

Companion docs:
- Full build: [`docs/project-plan.md`](./project-plan.md)
- Two-month delivery: [`docs/sprint-plan.md`](./sprint-plan.md)
- Gaps: [`docs/open-gaps.md`](./open-gaps.md)

Calendar assumption: **Week A starts 2026-08-11**, presentation ~**2026-08-24**. Shift if needed; keep order.

| Sprint | Dates (assumed) | Theme |
|--------|-----------------|-------|
| P0 (Week A) | Aug 11–17 | Foundations + working E2E happy path |
| P1 (Week B) | Aug 18–24 | Admin/treasury, harden the path, deploy, rehearse |

---

## What MVP means here

**MVP = real product slice, delivered fast.**

The payment path must actually run end to end:

```text
quote (server) → intent (persisted) → user pays USDT on Polygon or Base
  → deposit detected → credited → MoMo disbursement (sandbox)
  → paid → receipt
```

Every step has a real implementation. We cut **breadth and production hardening**, not correctness of the core flow.

### Must work (non-negotiable)

- Server-trusted quote (rate, fee, net FRW, expiry)
- Persisted payment intent with real status transitions
- User pay flow: MoMo MSISDN, chain (Polygon/Base), treasury instructions
- On-chain deposit detection for treasury USDT (testnet OK)
- MoMo **sandbox** disbursement (token → transfer → status), not a UI-only fake
- Receipt with real refs (intent id, tx hash, MoMo reference)
- Thin admin that reads the same data (txs, FX, treasury)

### Scope cuts (how we finish in 2 weeks)

| Cut | Still real? |
|-----|-------------|
| Testnet + MoMo sandbox only (no mainnet / no `mtnrwanda` prod) | Yes, E2E in sandbox/testnet |
| One token (USDT) on Polygon + Base | Yes |
| Minimal GraphQL: working watcher/webhook first; richer GraphQL query layer can be thin | Yes, detect must work |
| Auth: magic link or email; one admin role | Yes |
| Admin: txs, FX, treasury snapshots, basic review only | Yes |
| Receipts: printable HTML | Yes |
| Notifications: in-app status (email optional) | Yes |
| No full RLS audit, rate-limit suite, reorg perfection, load tests, legal final copy | Core path still works |
| **No landing redesign** | Yes. Treat current landing as the solid marketing UI |

### Landing UI policy (important)

The existing landing (`components/landing/*`, `app/page.tsx`, `app/globals.css` tokens) is a **solid base**. Do not fully refactor or rebuild it in these two weeks.

**Do**
- Reuse layout, components, typography, colors (`niko-*`), spacing, and motion patterns
- Small targeted edits: Polygon/Base copy, FAQ/trust bar accuracy, wire calculator to server quote
- Match pay/admin UI to the same visual language (tokens, buttons, section rhythm)

**Do not**
- Restyle the whole marketing site
- Replace the component set “for consistency”
- Drive-by refactors of hero/how-it-works/features unless required for correctness

New surfaces (`/app`, `/admin`) should feel like the same product family, not a second design system.

### Contingency only (if a credential is blocked)

Use temporary stand-ins **only** when an external dependency is unavailable, and replace before presentation if at all possible:

| Blocked input | Temporary stand-in | Still required before calling it “E2E done” |
|---------------|--------------------|-----------------------------------------------|
| D1 Supabase | Local Supabase CLI (preferred) or same repository interface | Persisted intents, not browser-only memory for the demo path |
| D3 MoMo sandbox | Recorded sandbox client behind interface + queued retry | Must switch to live sandbox calls once keys exist |
| D4/D5 chain | Poller against public testnet RPC + known treasury | Must detect a real testnet Transfer, not a “simulate” primary path |

A **simulate deposit** control may exist for local dev recovery, but it is **not** the presentation happy path. Presentation path = real testnet transfer + real sandbox MoMo.

---

## Inputs needed this fortnight

| ID | Need by | Why |
|----|---------|-----|
| D1 | P0 Day 1–2 | Persist intents, auth, FX |
| D3 | P0 Day 4–5 | Real MoMo sandbox payout |
| D4 | P0 Day 3–4 | Treasury receive addresses (testnet) |
| D5 | P0 Day 4 | RPC / webhook for deposit detect |
| WalletConnect project id | P1 Day 1–2 | Connect + send UX |
| P3 | P0 Day 3 | USDT contract addresses on testnets |

If late, keep building against interfaces; do not redefine MVP as mock-only.

---

## Working agreements

- Core path works without a narrator explaining “imagine this hits the chain.”
- Prefer completing E2E over extra admin chrome.
- **Extend the current landing; do not rebuild it.**
- Safe defaults from [`docs/sprint-plan.md`](./sprint-plan.md) for open P1/P2/P6/P7 until you decide.
- Build + lint + a scripted E2E check green every day by Week B.
- Screen recording is backup for network failure, not a substitute for a working system.
- After presentation, deepen via the 2-month plan; do not rewrite the happy path.

---

## Architecture (2-week, real rails)

```text
Landing
  → Auth (Supabase)
  → Pay wizard
  → POST quote / intent (server)
  → User sends USDT (WalletConnect or wallet) to treasury on Polygon/Base testnet
  → Watcher/webhook detects Transfer → credit intent
  → Settlement job → MTN MoMo sandbox transfer
  → Callback/poll → paid
  → Receipt

Admin (same DB)
  → Transactions, FX config, treasury balances
```

Latency target for detect remains ~1s (3s OK) on the watcher path.

---

# Sprint P0. Week A — working E2E

**Dates:** Aug 11–17  
**Goal:** One real happy path: testnet USDT → credited → MoMo sandbox → paid → receipt.  
**Maps to 2-month:** S1–S5 compressed

### Day 1 (Mon). Foundation
- [x] Supabase init + migrations: profiles, fx_rates, chains, tokens, treasury_wallets, payment_intents, chain_deposits, momo_transfers (ledger_entries deferred)
- [x] RLS v1 good enough for user-owned intents; service role for workers
- [x] `lib/supabase` server + client (+ admin)
- [ ] Route groups `(marketing)`, `(app)`, `(admin)` without ripping up existing landing structure
- [ ] Landing: **surgical** copy updates only (Polygon + Base; not TRC20-first). Keep components/layout.
- [x] `.env.example` (names only)

**Done when:** migrations apply; empty app shells render; landing still looks like today’s product with accurate chain copy.

**Pickup note (2026-08-14):** Hosted NIKOPAY project has foundation schema + seed. Next is Day 2 quote/intent APIs. Paste service role into `.env.local` first. See `docs/eod-2026-08-14.md`.

### Day 2 (Tue). Auth + quote + intent
- [ ] Supabase Auth (magic link)
- [ ] Protect `/app` and `/admin`
- [ ] `POST /api/quotes` from `fx_rates`
- [ ] `POST /api/intents` + `GET` list/detail
- [ ] Shared quote math; wire existing `RateCalculator` / landing estimate to it (no calculator redesign)
- [x] Intent states: `awaiting_payment` → … → `paid` / `failed` (pure helpers done; DB column + RLS ready)

**Done when:** signed-in user creates a persisted, priced intent; landing calculator stays familiar.

### Day 3 (Wed). Pay UI + treasury instructions
- [ ] Wizard: amount → MoMo MSISDN → review → pay instructions
- [ ] MSISDN normalize/validate (`250…`)
- [ ] Chain select: Polygon / Base testnet
- [ ] Show real treasury address + token + exact amount + expiry
- [ ] History + status page (poll or realtime)
- [ ] Seed token/treasury rows (P3/D4)

**Done when:** user knows exactly what to send on-chain.

### Day 4 (Thu). Chain detect (real)
- [ ] Hot-path watcher or webhook on treasury `Transfer` (USDT)
- [ ] Idempotent `chain_deposits` upsert `(chain_id, tx_hash, log_index)`
- [ ] Match deposit → open intent → `detected` → `credited` (P1 default confirms)
- [ ] Status page shows explorer link to real tx
- [ ] Measure detect latency; aim 1s / accept 3s
- [ ] Dev-only simulate kept behind flag for recovery; not default UX

**Done when:** a real testnet Transfer credits a matching intent.

### Day 5 (Fri). MoMo sandbox + receipt
- [ ] Thin MoMo client: token, transfer, getStatus (sandbox host)
- [ ] Settlement: `credited` → `payout_pending` → `paid`/`failed`
- [ ] UUID v4 `X-Reference-Id`; idempotent attempts
- [ ] Callback route and/or poller
- [ ] Receipt page with real intent, tx hash, MoMo ref, amounts
- [ ] Dry-run full path once on testnet + sandbox

**P0 acceptance (must all pass)**
- [ ] Create quote + intent against Supabase
- [ ] Real testnet USDT transfer is detected and credits the intent
- [ ] MoMo sandbox disbursement is requested and reaches a terminal status
- [ ] User sees `paid` (or honest `failed`) and a receipt with real refs
- [ ] Build/lint green

---

# Sprint P1. Week B — ops surface, reliability, present

**Dates:** Aug 18–24  
**Goal:** Admin/treasury on real data; E2E reliable for stage; preview deployed.  
**Maps to 2-month:** thin S6 + deploy slice

### Day 1 (Mon). Admin on live data
- [ ] Dashboard counts from real intents
- [ ] Transactions table + detail timeline (real status history)
- [ ] FX editor writes `fx_rates`; next quote uses new values
- [ ] Role gate: admin only

**Done when:** admin views and FX change affect the working path.

### Day 2 (Tue). Treasury + wallet send
- [ ] Treasury page: balances from chain RPC + MoMo sandbox balance if available (else last known + ledger)
- [ ] Liquidity moves with real credits/payouts (ledger-backed)
- [ ] Manual review for `failed` / `manual_review` with retry payout
- [ ] WalletConnect (or equivalent) send on Polygon/Base testnet for the pay step
- [ ] Fallback: clear copy-address + amount if WC flakes, still real on-chain pay

**Done when:** user can pay from a connected wallet; admin sees treasury impact.

### Day 3 (Wed). Reliability pass
- [ ] Duplicate webhook/deposit cannot double-credit or double-pay
- [ ] MoMo PENDING → poll to terminal
- [ ] Expired intent cannot be credited
- [ ] Mismatch amount → `manual_review` (no silent pay)
- [ ] Basic error states in UI (no spinner forever)
- [ ] FAQ / how-it-works aligned with real flow
- [ ] Label environments: testnet + MoMo sandbox (honest, not “fake”)

**Done when:** failure modes are honest and safe.

### Day 4 (Thu). Deploy + evidence
- [ ] Preview/staging deploy with env configured
- [ ] Seed script for FX/chains/tokens/treasury; optional sample completed txs
- [ ] Reset script for demo room (reseed config; do not invent fake paid txs as the proof)
- [ ] Capture one evidence pack: testnet tx URL + MoMo sandbox ref + receipt screenshot
- [ ] Backup screen recording of the **real** path
- [ ] 60s / 5min scripts (below)

**Done when:** cold start on preview URL can complete E2E.

### Day 5 (Fri). Rehearsal + freeze
- [ ] Two full rehearsals on the deployed app
- [ ] Fix only P0 breakages on the happy path
- [ ] Feature freeze
- [ ] Speaker notes + who clicks what
- [ ] Confirm laptop funded with testnet USDT + MoMo sandbox creds loaded

**P1 acceptance (presentation ready)**
- [ ] Rehearsed E2E on deployed URL: auth → quote → pay on-chain → detect → MoMo sandbox → paid → receipt
- [ ] Admin shows that same tx + FX + treasury
- [ ] Idempotency proven once (replay deposit/webhook safely)
- [ ] Evidence pack saved
- [ ] Backup recording of the real path exists

---

## Quick wins (still real)

Ship early for momentum; each is part of the working system:

1. Surgical landing Polygon/Base copy (no redesign)  
2. Shared server quote math on existing calculator + app  
3. Pay wizard against persisted intents (reuse landing tokens/patterns)  
4. Status timeline bound to DB states  
5. Watcher credits on real Transfer  
6. MoMo sandbox transfer + status  
7. Receipt with real refs  
8. Admin FX + tx list  
9. Treasury cards from ledger/RPC  
10. Deployed preview URL  

---

## What is real now vs later (2-month)

| Capability | 2-week MVP (working) | Later (2-month plan) |
|------------|----------------------|----------------------|
| Intent store | Supabase | RLS hardened, more tables |
| Auth | Magic link + admin role | Fuller roles, session edge cases |
| Quote | Server + DB FX | TTL/caps/velocity polish |
| Chain detect | Working watcher/webhook on testnet | GraphQL indexer depth, multi-provider, reorg drills |
| MoMo | Sandbox disbursement E2E | Rwanda production (`mtnrwanda`), IP allowlist |
| Admin | Txs, FX, treasury, retry | Full audit, reports, risk suite |
| Security | Sensible defaults | Rate limits, advisors, pentest checklist |
| Deploy | Preview/staging | Prod gates, runbooks, compliance |

---

## Module targets

| Area | Paths |
|------|-------|
| Supabase | `supabase/migrations`, `lib/supabase/` |
| Quote / rates | `lib/rates.ts`, `app/api/quotes` |
| Intents | `lib/settlement/`, `app/api/intents` |
| Chain watch | `lib/chain/`, `app/api/webhooks/chain` |
| MoMo | `lib/momo/` (real sandbox client), `app/api/webhooks/momo` |
| Pay UI | `app/(app)/`, `components/pay/` (reuse `globals.css` / niko tokens) |
| Admin UI | `app/(admin)/`, `components/admin/` (same visual language) |
| Landing | `components/landing/*`, `app/page.tsx` (extend only; no full refactor) |

---

## Demo scripts (real path)

### 60-second version
1. Landing: USDT → MTN MoMo FRW.  
2. App: 50 USDT → MoMo number → quote.  
3. Pay on Base/Polygon testnet from wallet.  
4. Detection → MoMo sandbox payout → receipt.

### 5-minute version
1. Problem + landing (45s)  
2. Transparent quote (45s)  
3. Wizard + wallet pay (90s)  
4. Live detect + MoMo status (60s)  
5. Receipt refs (30s)  
6. Admin: same tx, FX, treasury (60s)  
7. What comes next toward production (30s)

### Fallback
If venue network fails: use backup recording of the **same real path**, plus explorer/MoMo evidence links.

---

## Definition of done (2-week MVP)

Done only when all are true:

1. Auth works; user creates a server quote and persisted intent.  
2. User pays allowlisted USDT on Polygon or Base **testnet** to treasury.  
3. System detects that transfer and credits the intent (SLA band).  
4. System executes MoMo **sandbox** disbursement idempotently.  
5. User reaches terminal status and opens a receipt with real references.  
6. Admin can see that transaction, change FX, and see treasury impact.  
7. Deployed URL can repeat the path after a cold start.  
8. Code is the foundation for the 2-month plan (no throwaway fake core).

Production Rwanda payouts, mainnet, and full hardening remain post-presentation work.

---

## Handoff into 2-month sprints

| 2-week artifact | Next deepening |
|-----------------|----------------|
| Supabase schema + auth | S1–S2 RLS/roles |
| Quote/intent | S2–S3 TTL, caps |
| Watcher/webhook | S4 GraphQL indexer richness |
| MoMo sandbox client | S5–S7 prod readiness (D2) |
| Admin thin console | S6–S7 full ops |
| Staging preview | S7–S8 harden + UAT |

Keep `DEMO_MODE` simulate only as a local escape hatch until watcher reliability is proven; presentation uses the real path.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Creds late (D1/D3/D4/D5) | Unblock with local Supabase CLI; escalate keys immediately; do not switch MVP definition to mocks |
| Testnet faucet / funding | Prefund treasury + presenter wallet before Day 4 |
| MoMo sandbox quirks | Implement poll + callback; rehearse twice |
| WalletConnect issues | Copy-address still sends real USDT |
| Scope creep (full indexer/admin) | E2E path first; GraphQL/admin depth only after paid works |
| Venue network | Recording + evidence pack of real txs |

---

## Change log

| Date | Change |
|------|--------|
| 2026-08-10 | Initial 2-week plan |
| 2026-08-10 | Revised: MVP = working E2E in short time; mocks are contingency only, not the product |
| 2026-08-10 | Landing treated as solid UI base; extend, do not full-refactor |
