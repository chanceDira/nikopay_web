import { jsonData, jsonError, isUuid } from "@/lib/http";
import { getPaymentIntent } from "@/lib/intents";
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

  if (
    afterScan.intent.status === "credited" ||
    afterScan.intent.status === "payout_pending"
  ) {
    await runPayouts(id);
  }

  const latest = await getPaymentIntent(id);
  if (!latest.ok) {
    return jsonError(latest.reason, latest.status);
  }

  return jsonData(latest.intent);
}
