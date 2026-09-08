import { jsonData, jsonError, isUuid } from "@/lib/http";
import { getPaymentIntent } from "@/lib/intents";
import { getPawapayConfig } from "@/lib/pawapay/config";
import { isOpenPayoutStatus } from "@/lib/pawapay/payout-guard";
import { reconcilePayout } from "@/lib/pawapay/poll";
import { loadLatestPayoutTransfer } from "@/lib/pawapay/transfers";
import { runPayouts } from "@/lib/payouts";
import { scanDeposits } from "@/lib/scan-deposits";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("payment intent not found", 404);
  }

  const loaded = await getPaymentIntent(id);
  if (!loaded.ok) {
    return jsonError(loaded.reason, loaded.status);
  }

  if (loaded.intent.status === "awaiting_payment") {
    await scanDeposits(loaded.intent.chain);
  }

  const afterScan = await getPaymentIntent(id);
  if (!afterScan.ok) {
    return jsonError(afterScan.reason, afterScan.status);
  }

  if (afterScan.intent.status === "credited") {
    await runPayouts(id);
  } else if (afterScan.intent.status === "payout_pending") {
    await reconcileOpenPayout(id);
  }

  const latest = await getPaymentIntent(id);
  if (!latest.ok) {
    return jsonError(latest.reason, latest.status);
  }

  return jsonData(latest.intent);
}

async function reconcileOpenPayout(intentId: string): Promise<void> {
  const configured = getPawapayConfig();
  if (!configured.ok) {
    return;
  }

  const transfer = await loadLatestPayoutTransfer(intentId);
  if (!transfer.ok || !transfer.row) {
    return;
  }
  if (transfer.row.status === "failed") {
    return;
  }
  if (
    !isOpenPayoutStatus(transfer.row.status) &&
    transfer.row.status !== "successful"
  ) {
    return;
  }

  await reconcilePayout(transfer.row.payout_id, configured.config);
}
