import { applyPayoutCallback } from "@/lib/pawapay/callback";
import { getPayout } from "@/lib/pawapay/client";
import type { PawapayConfig } from "@/lib/pawapay/config";
import { settlePayout } from "@/lib/pawapay/settle";
import { loadOpenPayoutTransfers } from "@/lib/pawapay/transfers";
import type { DomainPayoutStatus } from "@/lib/pawapay/types";

const BATCH = 10;

export type PollResult = {
  payoutId: string;
  status: DomainPayoutStatus;
  settled: boolean;
};

export type PollStore = {
  getOpen: typeof loadOpenPayoutTransfers;
  apply: typeof applyPayoutCallback;
  settle: typeof settlePayout;
};

type FetchLike = typeof fetch;

export async function runPawapayPoll(input: {
  config: PawapayConfig;
  limit?: number;
  fetchImpl?: FetchLike;
  store?: PollStore;
}): Promise<
  { ok: true; polled: PollResult[] } | { ok: false; reason: string }
> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const store = input.store ?? {
    getOpen: loadOpenPayoutTransfers,
    apply: applyPayoutCallback,
    settle: settlePayout,
  };

  const open = await store.getOpen(input.limit ?? BATCH);
  if (!open.ok) {
    return open;
  }

  const polled: PollResult[] = [];
  for (const row of open.rows) {
    const result = await reconcilePayout(
      row.payout_id,
      input.config,
      fetchImpl,
      store,
    );
    if (result) {
      polled.push(result);
    }
  }

  return { ok: true, polled };
}

export async function reconcilePayout(
  payoutId: string,
  config: PawapayConfig,
  fetchImpl: FetchLike = fetch,
  store: PollStore = {
    getOpen: loadOpenPayoutTransfers,
    apply: applyPayoutCallback,
    settle: settlePayout,
  },
): Promise<PollResult | null> {
  const lookup = await getPayout(config, payoutId, fetchImpl);
  if (!lookup.ok || lookup.data.status !== "FOUND") {
    return null;
  }

  const applied = await store.apply(lookup.data.data);
  if (!applied.ok) {
    return null;
  }

  const { payoutId: id, status } = applied.outcome;
  if (status !== "successful" && status !== "failed") {
    return { payoutId: id, status, settled: false };
  }

  const settled = await store.settle(id);
  return {
    payoutId: id,
    status,
    settled: settled.ok && settled.outcome.intentStatus !== null,
  };
}
