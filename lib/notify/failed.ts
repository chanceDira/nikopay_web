import { txExplorerUrl } from "@/lib/chain-config";
import { sendFailedEmail } from "@/lib/notify/email";
import { loadFailedRefs } from "@/lib/notify/transfer-refs";
import { toNumber } from "@/lib/numbers";
import { isChainId } from "@/lib/settlement/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function notifyIntentFailed(intentId: string): Promise<void> {
  const supabase = createAdminClient();
  const loaded = await supabase
    .from("payment_intents")
    .select(
      "id, status, notify_email, failed_notified_at, net_rwf, usdt_amount, fee_rwf, rate, msisdn, deposit_tx, chain_id, wallet_address",
    )
    .eq("id", intentId)
    .maybeSingle();

  if (loaded.error || !loaded.data) {
    return;
  }

  const row = loaded.data;
  if (
    row.status !== "manual_review" ||
    !row.notify_email ||
    row.failed_notified_at
  ) {
    return;
  }
  if (!isChainId(row.chain_id)) {
    return;
  }

  const transfer = await loadFailedRefs(intentId);
  if (!transfer) {
    return;
  }

  if (isUnconfirmedSubmitFailure(transfer.providerReason)) {
    return;
  }

  const depositTx = row.deposit_tx ?? undefined;

  const sent = await sendFailedEmail({
    to: row.notify_email,
    intentId: row.id,
    netRwf: toNumber(row.net_rwf),
    usdtAmount: toNumber(row.usdt_amount),
    feeRwf: toNumber(row.fee_rwf),
    rate: toNumber(row.rate),
    msisdn: row.msisdn,
    walletAddress: row.wallet_address,
    chain: row.chain_id,
    depositTx,
    depositExplorerUrl: depositTx
      ? (txExplorerUrl(row.chain_id, depositTx) ?? undefined)
      : undefined,
    momoStatus: transfer.status,
    momoReferenceId: transfer.referenceId,
    providerReason: transfer.providerReason ?? undefined,
  });

  if (!sent.ok) {
    return;
  }

  await supabase
    .from("payment_intents")
    .update({ failed_notified_at: new Date().toISOString() })
    .eq("id", intentId)
    .eq("status", "manual_review")
    .is("failed_notified_at", null);
}

function isUnconfirmedSubmitFailure(reason: string | null): boolean {
  if (!reason) {
    return false;
  }
  return (
    reason === "request_not_accepted" ||
    reason.startsWith("momo transfer request failed") ||
    reason.startsWith("momo token request failed") ||
    reason.includes("INVALID_CALLBACK_URL_HOST")
  );
}
