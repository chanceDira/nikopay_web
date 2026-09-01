import { randomUUID } from "node:crypto";

import { isUuid } from "@/lib/http";
import { getPaymentIntent } from "@/lib/intents";
import { toNumber } from "@/lib/numbers";
import { formatPayoutAmount } from "@/lib/pawapay/amount";
import {
  getActiveConf,
  initiatePayout,
  predictProvider,
} from "@/lib/pawapay/client";
import { getPawapayConfig, type PawapayConfig } from "@/lib/pawapay/config";
import {
  pickPayoutCorridor,
  type PayoutCorridor,
} from "@/lib/pawapay/corridor";
import { reconcilePayout } from "@/lib/pawapay/poll";
import { settlePayout } from "@/lib/pawapay/settle";
import {
  insertPayoutTransfer,
  loadLatestPayoutTransfer,
  updatePayoutTransfer,
} from "@/lib/pawapay/transfers";
import type { PayoutRunResult } from "@/lib/payouts";
import { transitionStatus } from "@/lib/settlement/intent-status";
import type { PaymentIntent } from "@/lib/settlement/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MomoTransferRow, PayoutTransferRow } from "@/lib/supabase/types";

const BATCH = 10;

type FetchLike = typeof fetch;

export async function runPawapayPayouts(
  intentId?: string,
  fetchImpl: FetchLike = fetch,
): Promise<
  | { ok: true; payouts: PayoutRunResult[] }
  | { ok: false; reason: string; status: number }
> {
  const configured = getPawapayConfig();
  if (!configured.ok) {
    return { ok: false, reason: configured.reason, status: 503 };
  }

  if (intentId) {
    if (!isUuid(intentId)) {
      return { ok: false, reason: "payment intent not found", status: 404 };
    }
    const single = await payoutOne(intentId, configured.config, fetchImpl);
    if (!single.ok) {
      return single;
    }
    return { ok: true, payouts: [single.result] };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .select("id")
    .in("status", ["credited", "payout_pending"])
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) {
    return { ok: false, reason: "unable to load payouts", status: 503 };
  }

  const payouts: PayoutRunResult[] = [];
  for (const row of data ?? []) {
    const result = await payoutOne(row.id, configured.config, fetchImpl);
    if (result.ok) {
      payouts.push(result.result);
    }
  }

  return { ok: true, payouts };
}

async function payoutOne(
  intentId: string,
  config: PawapayConfig,
  fetchImpl: FetchLike,
): Promise<
  | { ok: true; result: PayoutRunResult }
  | { ok: false; reason: string; status: number }
> {
  const loaded = await getPaymentIntent(intentId);
  if (!loaded.ok) {
    return loaded;
  }

  if (loaded.intent.status === "credited") {
    const started = await startPayout(loaded.intent, config, fetchImpl);
    if (!started.ok) {
      return started;
    }
  }

  const transfer = await loadLatestPayoutTransfer(intentId);
  if (!transfer.ok) {
    return { ok: false, reason: transfer.reason, status: 503 };
  }
  if (!transfer.row) {
    return { ok: false, reason: "payout not found", status: 404 };
  }

  const reconciled = await reconcilePayout(
    transfer.row.payout_id,
    config,
    fetchImpl,
  );
  if (reconciled?.settled) {
    const current = await getPaymentIntent(intentId);
    return {
      ok: true,
      result: resultFromTransfer(
        intentId,
        transfer.row.payout_id,
        reconciled.status,
        current.ok ? current.intent.status : loaded.intent.status,
      ),
    };
  }

  if (transfer.row.status === "failed") {
    await settlePayout(transfer.row.payout_id);
    const current = await getPaymentIntent(intentId);
    return {
      ok: true,
      result: resultFromTransfer(
        intentId,
        transfer.row.payout_id,
        "failed",
        current.ok ? current.intent.status : loaded.intent.status,
      ),
    };
  }

  const retried = await retryInitiate(
    loaded.intent,
    transfer.row,
    config,
    fetchImpl,
  );
  if (!retried.ok) {
    return retried;
  }

  const again = await reconcilePayout(
    transfer.row.payout_id,
    config,
    fetchImpl,
  );
  const refreshed = await loadLatestPayoutTransfer(intentId);
  const status =
    again?.status ??
    (refreshed.ok && refreshed.row
      ? refreshed.row.status
      : transfer.row.status);
  const current = await getPaymentIntent(intentId);

  return {
    ok: true,
    result: resultFromTransfer(
      intentId,
      transfer.row.payout_id,
      status,
      current.ok ? current.intent.status : loaded.intent.status,
    ),
  };
}

async function startPayout(
  intent: PaymentIntent,
  config: PawapayConfig,
  fetchImpl: FetchLike,
): Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  const allowed = transitionStatus("credited", "payout_pending");
  if (!allowed.ok) {
    return { ok: false, reason: allowed.reason, status: 503 };
  }

  const corridorResult = await resolveCorridor(intent, config, fetchImpl);
  if (!corridorResult.ok) {
    return corridorResult;
  }

  const { corridor, amount, phoneNumber } = corridorResult;
  const supabase = createAdminClient();
  const existing = await loadLatestPayoutTransfer(intent.id);
  if (!existing.ok) {
    return { ok: false, reason: existing.reason, status: 503 };
  }

  const payoutId = existing.row?.payout_id ?? randomUUID();
  const claimed = await supabase
    .from("payment_intents")
    .update({ status: "payout_pending" })
    .eq("id", intent.id)
    .eq("status", "credited")
    .select("id")
    .maybeSingle();

  if (claimed.error) {
    return { ok: false, reason: "unable to start payout", status: 503 };
  }
  if (!claimed.data && !existing.row) {
    return { ok: true };
  }

  if (!existing.row) {
    const inserted = await insertPayoutTransfer({
      intentId: intent.id,
      payoutId,
      country: corridor.country,
      currency: corridor.currency,
      provider: corridor.provider,
      msisdn: phoneNumber,
      amount: toNumber(amount),
    });
    if (!inserted.ok) {
      return { ok: false, reason: inserted.reason, status: 503 };
    }
  }

  const initiated = await initiatePayout(
    config,
    {
      payoutId,
      amount,
      currency: corridor.currency,
      clientReferenceId: intent.id,
      recipient: {
        type: "MMO",
        accountDetails: {
          phoneNumber,
          provider: corridor.provider,
        },
      },
    },
    fetchImpl,
  );

  if (!initiated.ok) {
    await failOpenPayout(payoutId, initiated.reason, intent.id);
    return { ok: true };
  }

  if (initiated.data.status === "REJECTED") {
    await failOpenPayout(
      payoutId,
      initiated.data.failureReason?.failureCode ?? "rejected",
      intent.id,
    );
    return { ok: true };
  }

  return { ok: true };
}

async function retryInitiate(
  intent: PaymentIntent,
  row: PayoutTransferRow,
  config: PawapayConfig,
  fetchImpl: FetchLike,
): Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  if (row.status !== "pending") {
    return { ok: true };
  }

  const corridorResult = await resolveCorridor(intent, config, fetchImpl);
  if (!corridorResult.ok) {
    return corridorResult;
  }

  const { corridor, amount, phoneNumber } = corridorResult;
  const initiated = await initiatePayout(
    config,
    {
      payoutId: row.payout_id,
      amount,
      currency: corridor.currency,
      clientReferenceId: intent.id,
      recipient: {
        type: "MMO",
        accountDetails: {
          phoneNumber,
          provider: corridor.provider,
        },
      },
    },
    fetchImpl,
  );

  if (!initiated.ok) {
    await failOpenPayout(row.payout_id, initiated.reason, intent.id);
    return { ok: true };
  }

  if (initiated.data.status === "REJECTED") {
    await failOpenPayout(
      row.payout_id,
      initiated.data.failureReason?.failureCode ?? "rejected",
      intent.id,
    );
  }

  return { ok: true };
}

async function resolveCorridor(
  intent: PaymentIntent,
  config: PawapayConfig,
  fetchImpl: FetchLike,
): Promise<
  | {
      ok: true;
      corridor: PayoutCorridor;
      amount: string;
      phoneNumber: string;
    }
  | { ok: false; reason: string; status: number }
> {
  const predicted = await predictProvider(config, intent.msisdn, fetchImpl);
  if (!predicted.ok) {
    return { ok: false, reason: predicted.reason, status: 409 };
  }

  const conf = await getActiveConf(
    config,
    { country: predicted.data.country, operationType: "PAYOUT" },
    fetchImpl,
  );
  if (!conf.ok) {
    return { ok: false, reason: conf.reason, status: 503 };
  }

  const corridor = pickPayoutCorridor(conf.data, {
    country: predicted.data.country,
    provider: predicted.data.provider,
  });
  if (!corridor) {
    return {
      ok: false,
      reason: "payout corridor is not configured",
      status: 409,
    };
  }

  const amount = formatCorridorAmount(intent.netRwf, corridor);
  if (!amount) {
    return { ok: false, reason: "payout amount is invalid", status: 409 };
  }

  return {
    ok: true,
    corridor,
    amount,
    phoneNumber: predicted.data.phoneNumber,
  };
}

function formatCorridorAmount(
  netRwf: number,
  corridor: PayoutCorridor,
): string | null {
  const amount = formatPayoutAmount(netRwf, corridor.decimalsInAmount);
  if (!amount) {
    return null;
  }

  const value = toNumber(amount);
  const min = toNumber(corridor.minAmount);
  const max = toNumber(corridor.maxAmount);
  if (value < min || value > max) {
    return null;
  }

  return amount;
}

async function failOpenPayout(
  payoutId: string,
  reason: string,
  intentId: string,
): Promise<void> {
  await updatePayoutTransfer(payoutId, {
    status: "failed",
    providerReason: reason.slice(0, 240),
  });

  const allowed = transitionStatus("payout_pending", "manual_review");
  if (!allowed.ok) {
    return;
  }

  const supabase = createAdminClient();
  await supabase
    .from("payment_intents")
    .update({ status: "manual_review" })
    .eq("id", intentId)
    .eq("status", "payout_pending");
}

function resultFromTransfer(
  intentId: string,
  payoutId: string,
  status: PayoutTransferRow["status"],
  intentStatus: PaymentIntent["status"],
): PayoutRunResult {
  return {
    intentId,
    referenceId: payoutId,
    momoStatus: asMomoLikeStatus(status),
    intentStatus,
  };
}

function asMomoLikeStatus(
  status: PayoutTransferRow["status"],
): MomoTransferRow["status"] {
  if (status === "successful") {
    return "successful";
  }
  if (status === "failed") {
    return "failed";
  }
  return "pending";
}
