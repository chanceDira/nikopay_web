# NikoPay UI handoff plan

For the frontend collaborator.

**Your job:** fill in the empty pages and components already in the repo.  
**Do not:** invent new routes, redesign the landing, or rebuild the shells.

**Context**
- Presentation is in **11 days** (target: **Friday 22 Aug 2026**).
- Lead (blockchain + backend) needs **usable pages this week** to build APIs and chain flows on top of.
- UI for presentation should be **done this week if possible**, otherwise finished early next week (no later than mid next week).

Last updated: 2026-08-11

---

## Start here

1. Routes and empty shells are **already in the repo**. Do not recreate them.
2. Open each file below and replace empty stubs with real UI.
3. Match the landing look (`niko-*` in `app/globals.css`). You can refine spacing and components, but stay in the same visual family.
4. Use fixture/mock data until APIs exist. Keep field names from the Data shapes section.
5. This week = pay path first. Next week = admin polish + presentation freeze.

If unclear, ask before inventing a second design system.

---

## Why this week matters

| Who | Needs by |
|-----|----------|
| UI collaborator | Working screens (fixtures OK) |
| Lead (backend + chain) | Stable routes and components to wire quotes, intents, deposits, MoMo |

**Already available today for the lead to build on**
- `/app/pay`, `/app/payments`, `/app/payments/[id]`, receipt, profile
- `/admin/*` ops routes
- `/auth/sign-in`, `/auth/callback`
- `/privacy`, `/terms`
- Shared `PageHeader`, `AppNav`, `AdminNav`

Your fill-in work this week unlocks real integration. Empty stubs are not enough for demo.

---

## Design rules

| Rule | Meaning |
|------|---------|
| Landing stays | Small copy fixes only. No full redesign of `components/landing/*` |
| Same look | App and admin use landing tokens |
| Sentence case | e.g. “New payment” |
| No em dashes | Use commas or periods |
| Mobile pay flow | Wizard and status work on phone width |
| Honest states | Loading, empty, error, failed must exist |

**Copy from:** `components/landing/waitlist-form.tsx`, landing sections, `components/shared/page-header.tsx`.

**Tokens:** `niko-teal`, `niko-teal-bright`, `niko-surface`, `niko-muted`, `niko-border`, `background`, `foreground`.

**Files:** kebab-case (`pay-wizard.tsx`). **Exports:** PascalCase (`PayWizard`).

---

## Pages already scaffolded (fill these in)

### Shared
| File | Status |
|------|--------|
| `components/shared/page-header.tsx` | Done (reuse) |
| `components/shared/app-nav.tsx` | Done (refine active state OK) |
| `components/shared/admin-nav.tsx` | Done (refine active state OK) |

### App
| Route | Page | Fill this component / UI |
|-------|------|---------------------------|
| `/app` | `app/app/page.tsx` | Leave redirect |
| `/app/pay` | `app/app/pay/page.tsx` | `components/pay/pay-wizard.tsx` |
| `/app/payments` | `app/app/payments/page.tsx` | History list |
| `/app/payments/[id]` | `app/app/payments/[id]/page.tsx` | `components/pay/status-timeline.tsx` |
| `/app/payments/[id]/receipt` | `.../receipt/page.tsx` | `components/pay/payment-receipt.tsx` |
| `/app/profile` | `app/app/profile/page.tsx` | Profile form (can slip to early next week) |

### Admin
| Route | Page | Fill this |
|-------|------|-----------|
| `/admin` | `app/admin/page.tsx` | `components/admin/overview-cards.tsx` |
| `/admin/transactions` | `app/admin/transactions/page.tsx` | `components/admin/transactions-table.tsx` |
| `/admin/transactions/[id]` | `.../[id]/page.tsx` | Detail + timeline |
| `/admin/review` | `app/admin/review/page.tsx` | Review queue |
| `/admin/fx` | `app/admin/fx/page.tsx` | `components/admin/fx-form.tsx` |
| `/admin/treasury` | `app/admin/treasury/page.tsx` | `components/admin/treasury-cards.tsx` |
| `/admin/users` | `app/admin/users/page.tsx` | After presentation OK |

### Auth and legal
| Route | Work |
|-------|------|
| `/auth/sign-in` | Sign-in form UI |
| `/auth/callback` | Thin loading / done state |
| `/privacy` | Short real copy |
| `/terms` | Short real copy |

### Landing (extend only)
| Area | Work |
|------|------|
| FAQ / trust / how-it-works | Polygon + Base (not TRC20-first) |
| Rate calculator | Same quote helpers as app |
| Footer | Link `/privacy` and `/terms` |
| Navbar | Link to `/app` or `/auth/sign-in` |

---

## Sprint calendar (tight)

| Sprint | When | Must be true at end |
|--------|------|---------------------|
| **UI-1 This week** | **Wed 12 Aug → Sun 17 Aug 2026** | Pay path usable with fixtures. Lead can start wiring backend/chain against these pages |
| **UI-2 Next week** | **Mon 18 Aug → Wed 20 Aug 2026** | Admin screens + polish. UI presentation-ready |
| **Buffer** | **Thu 21 → Fri 22 Aug 2026** | Bugfix, rehearsal, freeze. No new features |
| **Presentation** | **~Fri 22 Aug 2026** | Demo |

Target: finish UI-1 **this week**. Finish UI-2 by **Wed 20 Aug**. Use Thu–Fri only for fixes.

Post-presentation hardening (profile depth, users admin, a11y) is after 22 Aug unless you finish early.

---

## UI-1 This week (12–17 Aug) — required

**Goal:** Clickable pay path. Backend/chain lead can attach real data.

| Day | Date | Ship |
|-----|------|------|
| Wed | 12 Aug | Shared: status chip, MSISDN input, copy button, empty/loading/error |
| Thu | 13 Aug | `PayWizard` steps 1–2 (amount + MoMo + validation) |
| Fri | 14 Aug | `PayWizard` steps 3–4 (quote + pay instructions + copy + countdown) |
| Sat | 15 Aug | `StatusTimeline` + `/app/payments` history list |
| Sun | 16–17 Aug | Receipt + sign-in UI + fixtures end-to-end |

### Checklist (this week)
- [ ] `pay-wizard.tsx` — 4 steps with validation
- [ ] Pay instructions: chain, treasury address, amount, countdown, copy
- [ ] `status-timeline.tsx` — all statuses via fixtures
- [ ] History list with links to `/app/payments/[id]`
- [ ] `payment-receipt.tsx` — printable
- [ ] `/auth/sign-in` form UI
- [ ] Fixture module so flow works without API
- [ ] Phone-width wizard works

### Done when (Sun 17 Aug)
- [ ] Lead can open `/app/pay` → history → status → receipt and see real layout hooks
- [ ] Fixtures cover every payment status
- [ ] `npm run build` passes

---

## UI-2 Next week (18–20 Aug) — presentation complete

**Goal:** Admin + landing polish. Demo-ready UI.

| Day | Date | Ship |
|-----|------|------|
| Mon | 18 Aug | Admin overview cards + transactions table |
| Tue | 19 Aug | Tx detail + FX form + treasury cards |
| Wed | 20 Aug | Review queue + wallet strip (or copy-address) + landing Polygon/Base copy + footer legal links |

Thu 21–Fri 22 = buffer only (bugs, rehearsal).

### Checklist
- [ ] `overview-cards.tsx`
- [ ] `transactions-table.tsx` + detail page
- [ ] `fx-form.tsx`
- [ ] `treasury-cards.tsx`
- [ ] `/admin/review` actions UI
- [ ] Wallet strip or strong copy-address on pay step
- [ ] Landing FAQ/trust: Polygon + Base
- [ ] Privacy + terms short copy + footer links
- [ ] Mobile pass on pay + status

### Done when (Wed 20 Aug)
- [ ] Admin can browse txs and open detail with fixtures
- [ ] Full UI demo path rehearsable
- [ ] No empty required stubs left for presentation screens

---

## After presentation (only if early / later)

- Profile MoMo field polish  
- `/admin/users`  
- Expiry / mismatch / manual-review messaging depth  
- Explorer links when `depositTx` exists  
- A11y and empty-state pass  

---

## If you fall behind

Priority order (do not skip ahead):

1. Pay wizard + instructions  
2. Status + history  
3. Receipt  
4. Sign-in UI  
5. Admin transactions + overview  
6. FX + treasury  
7. Review queue  
8. Wallet / copy-address  
9. Landing copy + legal  
10. Profile / users  

**Hard rule:** by **Sun 17 Aug**, items 1–4 must be done so backend/chain work is not blocked.

---

## Data shapes (fixtures and APIs)

```text
Quote
  usdtAmount, rate, feePercent, feeRwf, netRwf, expiresAt

Intent
  id, status, chain, msisdn
  usdtAmount, rate, feePercent, feeRwf, netRwf
  treasuryAddress, depositTx?, momoRef?, createdAt

Status
  awaiting_payment | detected | credited | payout_pending
  | paid | failed | expired | manual_review

FxConfig
  usdtToRwf, feePercent, minUsdt
```

UI chains: **Polygon** and **Base**.

---

## Out of scope for UI track

- Supabase schema, workers, RLS  
- Chain watcher / indexer  
- MoMo client  
- Settlement engine  

Show results in UI. If API missing, keep fixtures.

---

## How to run

```bash
npm install
npm run dev
npm run build
```

| URL | Purpose |
|-----|---------|
| `/` | Landing |
| `/app/pay` | Pay wizard |
| `/app/payments` | History |
| `/admin` | Admin |
| `/auth/sign-in` | Sign in |

---

## Definition of done

**This week (17 Aug)**  
Pay path filled, fixtures work, lead unblocked for backend/chain.

**Presentation (22 Aug)**  
UI-1 + UI-2 complete, mobile pay usable, admin browsable, landing chain copy correct, build green.

---

## Change log

| Date | Change |
|------|--------|
| 2026-08-11 | First UI plan |
| 2026-08-11 | Handoff rewrite with scaffolded pages |
| 2026-08-11 | Tightened for 11-day presentation: UI this week + early next week |
