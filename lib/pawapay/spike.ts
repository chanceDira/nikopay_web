import { randomUUID } from "node:crypto";

import { toNumber } from "@/lib/numbers";
import { formatPayoutAmount } from "@/lib/pawapay/amount";
import {
  getActiveConf,
  getPayout,
  initiatePayout,
  predictProvider,
} from "@/lib/pawapay/client";
import type { PawapayConfig } from "@/lib/pawapay/config";
import { pickPayoutCorridor } from "@/lib/pawapay/corridor";
import {
  isPawapayFinalStatus,
  mapPawapayPayoutStatus,
} from "@/lib/pawapay/status";
import type { GetPayoutResponse } from "@/lib/pawapay/types";
import {
  insertPayoutTransfer,
  loadIntentStatus,
  updatePayoutTransfer,
  type PayoutTransferInsert,
  type PayoutTransferPatch,
} from "@/lib/pawapay/transfers";

const SPIKE_INTENT_STATUSES = new Set(["expired", "failed", "manual_review"]);

export const SANDBOX_SUCCESS_MSISDN = "250783456789";

export type SpikeStore = {
  getIntentStatus: typeof loadIntentStatus;
  insertTransfer: typeof insertPayoutTransfer;
  updateTransfer: typeof updatePayoutTransfer;
};

export type SpikeResult = {
  payoutId: string;
  status: string;
};

type FetchLike = typeof fetch;

export async function runSandboxPayoutSpike(input: {
  intentId: string;
  msisdn: string;
  config: PawapayConfig;
  fetchImpl?: FetchLike;
  store?: SpikeStore;
  waitMs?: number;
  pollAttempts?: number;
}): Promise<{ ok: true; result: SpikeResult } | { ok: false; reason: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const store = input.store ?? {
    getIntentStatus: loadIntentStatus,
    insertTransfer: insertPayoutTransfer,
    updateTransfer: updatePayoutTransfer,
  };

  const intent = await store.getIntentStatus(input.intentId);
  if (!intent.ok) {
    return intent;
  }
  if (!SPIKE_INTENT_STATUSES.has(intent.status)) {
    return { ok: false, reason: "spike refuses live payment intents" };
  }

  const predicted = await predictProvider(
    input.config,
    input.msisdn,
    fetchImpl,
  );
  if (!predicted.ok) {
    return predicted;
  }

  const conf = await getActiveConf(
    input.config,
    { country: predicted.data.country, operationType: "PAYOUT" },
    fetchImpl,
  );
  if (!conf.ok) {
    return conf;
  }

  const corridor = pickPayoutCorridor(conf.data, {
    country: predicted.data.country,
    provider: predicted.data.provider,
  });
  if (!corridor) {
    return { ok: false, reason: "payout corridor is not configured" };
  }

  const amountValue = toNumber(corridor.minAmount);
  const amount = formatPayoutAmount(amountValue, corridor.decimalsInAmount);
  if (!amount) {
    return { ok: false, reason: "payout amount is invalid" };
  }

  const payoutId = randomUUID();
  const row: PayoutTransferInsert = {
    intentId: input.intentId,
    payoutId,
    country: corridor.country,
    currency: corridor.currency,
    provider: corridor.provider,
    msisdn: predicted.data.phoneNumber,
    amount: amountValue,
  };

  const inserted = await store.insertTransfer(row);
  if (!inserted.ok) {
    return inserted;
  }

  const initiated = await initiatePayout(
    input.config,
    {
      payoutId,
      amount,
      currency: corridor.currency,
      recipient: {
        type: "MMO",
        accountDetails: {
          phoneNumber: predicted.data.phoneNumber,
          provider: corridor.provider,
        },
      },
    },
    fetchImpl,
  );

  if (!initiated.ok) {
    await store.updateTransfer(payoutId, {
      status: "failed",
      providerReason: initiated.reason,
    });
    return { ok: true, result: { payoutId, status: "failed" } };
  }

  if (initiated.data.status === "REJECTED") {
    await store.updateTransfer(payoutId, {
      status: "failed",
      providerReason: initiated.data.failureReason?.failureCode ?? null,
    });
    return { ok: true, result: { payoutId, status: "failed" } };
  }

  const polled = await pollUntilFinal({
    config: input.config,
    payoutId,
    fetchImpl,
    waitMs: input.waitMs ?? 2_000,
    attempts: input.pollAttempts ?? 8,
  });

  const patch = patchFromLookup(polled);
  await store.updateTransfer(payoutId, patch);

  return { ok: true, result: { payoutId, status: patch.status } };
}

async function pollUntilFinal(input: {
  config: PawapayConfig;
  payoutId: string;
  fetchImpl: FetchLike;
  waitMs: number;
  attempts: number;
}): Promise<GetPayoutResponse | null> {
  let last: GetPayoutResponse | null = null;

  for (let i = 0; i < input.attempts; i += 1) {
    if (i > 0) {
      await sleep(input.waitMs);
    }

    const result = await getPayout(
      input.config,
      input.payoutId,
      input.fetchImpl,
    );
    if (!result.ok) {
      continue;
    }

    last = result.data;
    if (
      result.data.status === "FOUND" &&
      isPawapayFinalStatus(result.data.data.status)
    ) {
      return result.data;
    }
  }

  return last;
}

function patchFromLookup(
  lookup: GetPayoutResponse | null,
): PayoutTransferPatch {
  if (lookup?.status !== "FOUND") {
    return { status: "pending" };
  }

  const mapped = mapPawapayPayoutStatus(lookup.data.status);
  if (!mapped) {
    return { status: "pending" };
  }

  return {
    status: mapped,
    providerRef: lookup.data.providerTransactionId ?? null,
    providerReason: lookup.data.failureReason?.failureCode ?? null,
  };
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
