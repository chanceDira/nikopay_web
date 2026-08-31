import { notifyIntentFailed } from "@/lib/notify/failed";
import { notifyIntentPaid } from "@/lib/notify/paid";
import { loadPayoutTransfer } from "@/lib/pawapay/transfers";
import { transitionStatus } from "@/lib/settlement/intent-status";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PayoutTransferRow } from "@/lib/supabase/types";

type IntentOutcome = "paid" | "manual_review";

export type SettleOutcome = {
  intentId: string;
  intentStatus: IntentOutcome | null;
  claimed: boolean;
};

export type SettleStore = {
  getTransfer: typeof loadPayoutTransfer;
  claimIntent: typeof claimIntent;
  notifyPaid: typeof notifyIntentPaid;
  notifyFailed: typeof notifyIntentFailed;
};

export async function settlePayout(
  payoutId: string,
  settleStore?: SettleStore,
): Promise<
  { ok: true; outcome: SettleOutcome } | { ok: false; reason: string }
> {
  const store = settleStore ?? {
    getTransfer: loadPayoutTransfer,
    claimIntent,
    notifyPaid: notifyIntentPaid,
    notifyFailed: notifyIntentFailed,
  };

  const loaded = await store.getTransfer(payoutId);
  if (!loaded.ok) {
    return loaded;
  }
  if (!loaded.row) {
    return { ok: false, reason: "payout not found" };
  }

  return settleRow(loaded.row, store);
}

async function settleRow(
  row: PayoutTransferRow,
  store: SettleStore,
): Promise<
  { ok: true; outcome: SettleOutcome } | { ok: false; reason: string }
> {
  const target = intentOutcomeFor(row.status);
  if (!target) {
    return {
      ok: true,
      outcome: { intentId: row.intent_id, intentStatus: null, claimed: false },
    };
  }

  const allowed = transitionStatus("payout_pending", target);
  if (!allowed.ok) {
    return { ok: false, reason: allowed.reason };
  }

  const claim = await store.claimIntent(row, target);
  if (!claim.ok) {
    return claim;
  }

  if (target === "paid") {
    await store.notifyPaid(row.intent_id);
  } else {
    await store.notifyFailed(row.intent_id);
  }

  return {
    ok: true,
    outcome: {
      intentId: row.intent_id,
      intentStatus: target,
      claimed: claim.claimed,
    },
  };
}

export async function claimIntent(
  row: PayoutTransferRow,
  target: IntentOutcome,
): Promise<{ ok: true; claimed: boolean } | { ok: false; reason: string }> {
  const supabase = createAdminClient();
  const patch =
    target === "paid"
      ? { status: target, momo_ref: row.provider_ref ?? row.payout_id }
      : { status: target };

  const claimed = await supabase
    .from("payment_intents")
    .update(patch)
    .eq("id", row.intent_id)
    .eq("status", "payout_pending")
    .select("id")
    .maybeSingle();

  if (claimed.error) {
    return { ok: false, reason: "unable to settle payment intent" };
  }

  return { ok: true, claimed: Boolean(claimed.data) };
}

function intentOutcomeFor(
  status: PayoutTransferRow["status"],
): IntentOutcome | null {
  if (status === "successful") {
    return "paid";
  }
  if (status === "failed") {
    return "manual_review";
  }
  return null;
}
