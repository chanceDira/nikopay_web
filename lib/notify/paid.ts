import { txExplorerUrl } from "@/lib/chain-config";
import { sendPaidEmail } from "@/lib/notify/email";
import { toNumber } from "@/lib/numbers";
import { isChainId } from "@/lib/settlement/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Send MoMo success email once per intent. Safe to call on every settle.
 * Does not log the email address.
 */
export async function notifyIntentPaid(intentId: string): Promise<void> {
  const supabase = createAdminClient();
  const loaded = await supabase
    .from("payment_intents")
    .select(
      "id, status, notify_email, paid_notified_at, net_rwf, usdt_amount, fee_rwf, rate, msisdn, momo_ref, deposit_tx, chain_id, wallet_address",
    )
    .eq("id", intentId)
    .maybeSingle();

  if (loaded.error || !loaded.data) {
    return;
  }

  const row = loaded.data;
  if (row.status !== "paid" || !row.notify_email || row.paid_notified_at) {
    return;
  }
  if (!isChainId(row.chain_id)) {
    return;
  }

  const transfer = await supabase
    .from("momo_transfers")
    .select("reference_id, provider_ref")
    .eq("intent_id", intentId)
    .eq("status", "successful")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const depositTx = row.deposit_tx ?? undefined;
  const momoFinancial =
    transfer.data?.provider_ref ?? row.momo_ref ?? undefined;

  const sent = await sendPaidEmail({
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
    momoRef: momoFinancial,
    momoFinancialId: momoFinancial,
    momoReferenceId: transfer.data?.reference_id ?? undefined,
  });

  if (!sent.ok) {
    return;
  }

  await supabase
    .from("payment_intents")
    .update({ paid_notified_at: new Date().toISOString() })
    .eq("id", intentId)
    .eq("status", "paid")
    .is("paid_notified_at", null);
}
