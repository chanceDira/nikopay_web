import { jsonData, jsonError, readJsonBody, asRecord, isUuid } from "@/lib/http";
import { getPaymentIntent } from "@/lib/intents";
import { observeDepositTx } from "@/lib/observe-deposit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("payment intent not found", 404);
  }

  const loaded = await getPaymentIntent(id);
  if (!loaded.ok) {
    return jsonError(loaded.reason, loaded.status);
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError("invalid request body", 400);
  }
  const body = asRecord(parsed.body);
  if (!body) {
    return jsonError("invalid request body", 400);
  }

  const observed = await observeDepositTx({
    chain: loaded.intent.chain,
    txHash: body.txHash,
  });
  if (!observed.ok) {
    return jsonError(observed.reason, observed.status);
  }

  const latest = await getPaymentIntent(id);
  if (!latest.ok) {
    return jsonError(latest.reason, latest.status);
  }

  return jsonData(latest.intent);
}
