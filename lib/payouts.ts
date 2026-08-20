import { randomUUID } from "node:crypto";

import { isUuid } from "@/lib/http";
import { getPaymentIntent } from "@/lib/intents";
import { getTransferStatus, requestTransfer } from "@/lib/momo/client";
import { getMomoConfig } from "@/lib/momo/config";
import {
  mapMomoProviderStatus,
  payeeMsisdnForPayout,
  transferAmountForMomo,
} from "@/lib/momo/status";
import { notifyIntentPaid } from "@/lib/notify/paid";
import { transitionStatus } from "@/lib/settlement/intent-status";
import type { PaymentIntent } from "@/lib/settlement/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MomoTransferRow } from "@/lib/supabase/types";

const BATCH = 10;

export type PayoutRunResult = {
  intentId: string;
  referenceId: string;
  momoStatus: MomoTransferRow["status"];
  intentStatus: PaymentIntent["status"];
};

export async function runPayouts(
  intentId?: string,
) : Promise<
  | { ok: true; payouts: PayoutRunResult[] }
  | { ok: false; reason: string; status: number }
> {
  const config = getMomoConfig();
  if (!config.ok) {
    return { ok: false, reason: config.reason, status: 503 };
  }

  if (intentId) {
    if (!isUuid(intentId)) {
      return { ok: false, reason: "payment intent not found", status: 404 };
    }
    const single = await payoutOne(intentId);
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
    const result = await payoutOne(row.id);
    if (result.ok) {
      payouts.push(result.result);
    }
  }

  return { ok: true, payouts };
}

export async function applyMomoCallback(
  referenceId: string,
  providerStatus: unknown,
  financialTransactionId: string | null,
) : Promise<
  | { ok: true; result: PayoutRunResult }
  | { ok: false; reason: string; status: number }
> {
  const status = mapMomoProviderStatus(providerStatus);
  if (!status) {
    return { ok: false, reason: "invalid momo status", status: 400 };
  }

  return settleReference(referenceId, status, financialTransactionId);
}

async function payoutOne(
  intentId: string,
) : Promise<
  | { ok: true; result: PayoutRunResult }
  | { ok: false; reason: string; status: number }
> {
  const loaded = await getPaymentIntent(intentId);
  if (!loaded.ok) {
    return loaded;
  }

  if (loaded.intent.status === "credited") {
    const started = await startPayout(loaded.intent);
    if (!started.ok) {
      return started;
    }
  }

  const transfer = await loadOpenTransfer(intentId);
  if (!transfer.ok) {
    return transfer;
  }

  const config = getMomoConfig();
  if (!config.ok) {
    return { ok: false, reason: config.reason, status: 503 };
  }

  const lookup = await getTransferStatus(
    config.config,
    transfer.row.reference_id,
  );
  if (lookup.ok) {
    return settleReference(
      transfer.row.reference_id,
      lookup.lookup.status,
      lookup.lookup.financialTransactionId,
    );
  }

  const amount = transferAmountForMomo({
    netRwf: loaded.intent.netRwf,
    targetEnvironment: config.config.targetEnvironment,
  });
  if (!amount) {
    return { ok: false, reason: "payout amount is invalid", status: 409 };
  }

  const payee = payeeMsisdnForPayout({
    intentMsisdn: loaded.intent.msisdn,
    targetEnvironment: config.config.targetEnvironment,
    sandboxPayeeMsisdn: config.config.sandboxPayeeMsisdn,
  });
  if (!payee) {
    return {
      ok: false,
      reason: "momo sandbox payee is not configured",
      status: 503,
    };
  }

  const retried = await requestTransfer(config.config, {
    referenceId: transfer.row.reference_id,
    amount,
    currency: config.config.currency,
    msisdn: payee,
    externalId: loaded.intent.id,
  });

  if (retried.ok || retried.conflict) {
    const again = await getTransferStatus(
      config.config,
      transfer.row.reference_id,
    );
    if (again.ok) {
      return settleReference(
        transfer.row.reference_id,
        again.lookup.status,
        again.lookup.financialTransactionId,
      );
    }
  } else {
    await markTransferFailed(transfer.row.reference_id);
    await moveIntentToManualReview(intentId);
  }

  const current = await getPaymentIntent(intentId);
  return {
    ok: true,
    result: {
      intentId,
      referenceId: transfer.row.reference_id,
      momoStatus: transfer.row.status,
      intentStatus: current.ok ? current.intent.status : loaded.intent.status,
    },
  };
}

async function startPayout(
  intent: PaymentIntent,
) : Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  const moved = transitionStatus("credited", "payout_pending");
  if (!moved.ok) {
    return { ok: false, reason: moved.reason, status: 503 };
  }

  const config = getMomoConfig();
  if (!config.ok) {
    return { ok: false, reason: config.reason, status: 503 };
  }

  const amount = transferAmountForMomo({
    netRwf: intent.netRwf,
    targetEnvironment: config.config.targetEnvironment,
  });
  if (!amount) {
    return { ok: false, reason: "payout amount is invalid", status: 409 };
  }

  const payee = payeeMsisdnForPayout({
    intentMsisdn: intent.msisdn,
    targetEnvironment: config.config.targetEnvironment,
    sandboxPayeeMsisdn: config.config.sandboxPayeeMsisdn,
  });
  if (!payee) {
    return {
      ok: false,
      reason: "momo sandbox payee is not configured",
      status: 503,
    };
  }

  const supabase = createAdminClient();
  const existing = await supabase
    .from("momo_transfers")
    .select()
    .eq("intent_id", intent.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, reason: "unable to start payout", status: 503 };
  }

  const referenceId = existing.data?.reference_id ?? randomUUID();

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
  if (!claimed.data && !existing.data) {
    return { ok: true };
  }

  if (!existing.data) {
    const inserted = await supabase.from("momo_transfers").insert({
      intent_id: intent.id,
      reference_id: referenceId,
      amount_rwf: intent.netRwf,
      msisdn: payee,
      status: "pending",
    });

    if (inserted.error) {
      return { ok: false, reason: "unable to start payout", status: 503 };
    }
  }

  const requested = await requestTransfer(config.config, {
    referenceId,
    amount,
    currency: config.config.currency,
    msisdn: payee,
    externalId: intent.id,
  });

  if (!requested.ok && !requested.conflict) {
    await markTransferFailed(referenceId);
    await moveIntentToManualReview(intent.id);
    return { ok: true };
  }

  return { ok: true };
}

async function loadOpenTransfer(
  intentId: string,
) : Promise<
  | { ok: true; row: MomoTransferRow }
  | { ok: false; reason: string; status: number }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("momo_transfers")
    .select()
    .eq("intent_id", intentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unable to load payout", status: 503 };
  }
  if (!data) {
    return { ok: false, reason: "payout not found", status: 404 };
  }

  return { ok: true, row: data };
}

async function settleReference(
  referenceId: string,
  momoStatus: MomoTransferRow["status"],
  financialTransactionId: string | null,
) : Promise<
  | { ok: true; result: PayoutRunResult }
  | { ok: false; reason: string; status: number }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("momo_transfers")
    .select()
    .eq("reference_id", referenceId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "payout not found", status: 404 };
  }

  const updated = await supabase
    .from("momo_transfers")
    .update({
      status: momoStatus,
      provider_ref: financialTransactionId,
    })
    .eq("id", data.id)
    .select()
    .maybeSingle();

  if (updated.error || !updated.data) {
    return { ok: false, reason: "unable to update payout", status: 503 };
  }

  const intentUpdate = nextIntentStatus(momoStatus);
  if (intentUpdate) {
    const allowed = transitionStatus("payout_pending", intentUpdate);
    if (allowed.ok) {
      await supabase
        .from("payment_intents")
        .update({
          status: intentUpdate,
          momo_ref: financialTransactionId ?? referenceId,
        })
        .eq("id", data.intent_id)
        .eq("status", "payout_pending");

      if (intentUpdate === "paid") {
        await notifyIntentPaid(data.intent_id);
      }
    }
  }

  const intent = await getPaymentIntent(data.intent_id);
  if (!intent.ok) {
    return intent;
  }

  return {
    ok: true,
    result: {
      intentId: data.intent_id,
      referenceId,
      momoStatus,
      intentStatus: intent.intent.status,
    },
  };
}

function nextIntentStatus(
  momoStatus: MomoTransferRow["status"],
): "paid" | "manual_review" | null {
  if (momoStatus === "successful") {
    return "paid";
  }
  if (momoStatus === "failed" || momoStatus === "timeout") {
    return "manual_review";
  }
  return null;
}

async function markTransferFailed(referenceId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("momo_transfers")
    .update({ status: "failed" })
    .eq("reference_id", referenceId)
    .eq("status", "pending");
}

async function moveIntentToManualReview(intentId: string): Promise<void> {
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

export function parsePayoutIntentId(
  value: string | null,
) : { ok: true; intentId?: string } | { ok: false; reason: string } {
  if (value === null || value === "") {
    return { ok: true };
  }
  if (!isUuid(value)) {
    return { ok: false, reason: "payment intent not found" };
  }
  return { ok: true, intentId: value };
}
