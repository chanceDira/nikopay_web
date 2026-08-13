# NikoPay open gaps

Track decisions and missing inputs. Close items over time. Do not treat unchecked items as blockers for scaffolding UI or schema stubs.

See also:
- [`docs/project-plan.md`](./project-plan.md) for the full execution plan
- [`docs/sprint-plan.md`](./sprint-plan.md) for the 2-month sprint schedule
- [`docs/presentation-sprint-plan.md`](./presentation-sprint-plan.md) for the 2-week presentation MVP

Last updated: 2026-08-14

## Status legend

- `open` — needs a decision or credential
- `deferred` — intentionally later
- `decided` — locked enough to build against
- `blocked` — waiting on external party
- `partial` — project/input exists; still needs a key or final value

---

## Decided (build against these)

| Item | Decision |
|------|----------|
| Product | Stablecoin settlement: USDT in → FRW out on MTN MoMo |
| MVP flow | User wallet → NikoPay treasury → MoMo recipient |
| Test chains | Polygon + Base (primary). TRON deferred |
| Settlement detect SLA | Target ~1s credit detect; 3s OK |
| Data platform | Supabase (Postgres + Auth). RLS by default |
| Hosted project (presentation) | Org **JONAS BACKUP BUILDS**; project **NIKOPAY**; ref `jcfhoqrandavrajdamun`; region `eu-west-2` |
| Frontend | Next.js 16 + TypeScript + Tailwind |
| MoMo product | Disbursements (Pay / transfer). Collections later |
| Indexer query API | GraphQL preferred for indexed chain data |
| MoMo client | Thin first-party `fetch` client preferred over random npm SDKs until audited |
| Agent tooling | `.cursor/`, `.vscode/`, `AGENTS.md`, `CLAUDE.md` stay local / gitignored |

---

## Open product / architecture decisions

| ID | Gap | Status | Notes |
|----|-----|--------|-------|
| P1 | Credit confirmation policy per chain | open | Base: Flashblock vs 1 sealed block. Polygon: 1 vs 2 blocks / milestone. Affects reorg risk vs 1s SLA |
| P2 | Deposit matching strategy | open | Exact amount window vs per-intent deposit address vs memo/tag. Security vs UX tradeoff |
| P3 | Supported tokens/contracts | open | Official USDT (and/or USDC) contract addresses on Polygon + Base for test + prod |
| P4 | Indexer implementation | open | GraphQL is the query target. Pick stack (see indexer section). Hot path for 1s still needs push (webhook/subscription), not poll-only |
| P5 | Meaning of "1 second" in UX copy | open | Time to payment recognized vs MoMo SMS received. Recommend: recognized/credit |
| P6 | Quote lock TTL and amount tolerance | open | How long a rate holds; dust/tolerance when matching Transfer value |
| P7 | Payout caps / velocity limits | open | Fast-credit risk controls for small vs large tickets |
| P8 | Admin roles model | open | Which roles in Supabase `app_metadata`; RLS matrix |

---

## Deferred (fill later)

| ID | Gap | Status | Notes |
|----|-----|--------|-------|
| D1 | Supabase project credentials | partial | Hosted **NIKOPAY** (`jcfhoqrandavrajdamun`) live. URL + publishable/anon in `.env.local`. **Still need service role / secret** in `.env.local` for admin client |
| D2 | MoMo Rwanda production specifics | deferred | Live wallet, RWF fees, IP whitelist, callback host, partner portal. Sandbox shape is enough for now |
| D3 | MoMo sandbox credentials | deferred | Subscription keys, api user/key, callback URL |
| D4 | Treasury wallet addresses | deferred | Placeholder rows seeded inactive. Replace with real testnet receive addresses before pay path |
| D5 | Chain RPC / webhook provider keys | deferred | Alchemy, QuickNode, or equivalent for Polygon + Base |
| D6 | KYC / compliance depth for MVP | deferred | What is required before first live payout |
| D7 | Hosting / env matrix | deferred | Render (or other) + Supabase regions; `0.0.0.0:$PORT` |
| D8 | Legal pages | decided | `/privacy` and `/terms` routes exist (light copy OK for presentation) |

---

## Indexer notes (GraphQL preferred)

**Decision:** GraphQL is the ideal query interface for indexed on-chain data (deposits, history, admin, reconciliation).

**Input still needed (P4):** which GraphQL indexer stack, and how it pairs with the fast settlement path.

### Recommended shape

```text
Chain (Polygon / Base)
  → indexer (builds GraphQL API over Transfer events)
  → NikoPay sync (optional but recommended) into Supabase
  → settlement engine reads Supabase (source of truth for money movement)

Hot path for ~1s:
  webhook / GraphQL subscription / stream on Transfer(to=treasury)
  → verify + idempotent upsert
  → credit intent → enqueue MoMo
```

### Why not GraphQL-only polling

- Polling a GraphQL API every few hundred ms is fragile and usually misses a strict 1s SLA under load.
- GraphQL shines for typed queries, history, and admin.
- Keep a **push** channel for credit detection; use GraphQL as the indexed query layer (and backfill).

### Stack options (legitimate / common)

| Option | GraphQL | Fit for NikoPay | Caveat |
|--------|---------|-----------------|--------|
| The Graph (subgraph) | Yes | Strong query model; Polygon + Base subgraphs common | Hosted service deprecated historically; use decentralized network or a hosted subgraph provider. Weaker as sole sub-second trigger |
| Goldsky (subgraph / Mirror) | Yes | Managed GraphQL + streaming into DB | Paid; verify pricing and chain support |
| Envio HyperIndex | GraphQL available | Fast EVM indexing; good Transfer indexing | Confirm GraphQL exposure and ops model for our deploy |
| Ponder | Often pairs with custom API | TS-native; easy next to Next.js | GraphQL not always first-class; may need extra layer |

**Lean recommendation to close P4 later:**
1. Subgraph-style GraphQL schema for `Transfer` → treasury (The Graph or Goldsky).
2. Push notifications (provider webhooks or indexer webhooks) for settlement kickoff.
3. Mirror credited deposits into Supabase with unique `(chain_id, tx_hash, log_index)`.

Do not install an indexer package until P4 is closed and the publisher is audited.

---

## Scaffold vs credentials

- Scaffold UI, domain types, Supabase migration stubs, and MoMo client interfaces **without** live secrets.
- Wire real Supabase / MoMo / RPC keys when provided (D1–D5).
- Never commit `.env*` or service-role keys.

---

## Closing checklist (lightweight)

When closing a gap, update this file:
1. Move the row to Decided or mark Status `decided`.
2. Add a one-line decision and date.
3. Link PR or doc if useful.
