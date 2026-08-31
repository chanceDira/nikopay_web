import { txExplorerUrl } from "@/lib/chain-config";
import { sendPaidEmail } from "@/lib/notify/email";
import { loadPaidRefs } from "@/lib/notify/transfer-refs";
import { toNumber } from "@/lib/numbers";
import { isChainId } from "@/lib/settlement/types";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const refs = await loadPaidRefs(intentId);

  const depositTx = row.deposit_tx ?? undefined;
  const momoFinancial = refs.providerRef ?? row.momo_ref ?? undefined;

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
    momoReferenceId: refs.referenceId ?? undefined,
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
