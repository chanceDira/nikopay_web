import {
  asRecord,
  isUuid,
  jsonData,
  jsonError,
  readJsonBody,
} from "@/lib/http";
import { applyMomoCallback } from "@/lib/payouts";

type RouteContext = {
  params: Promise<{ referenceId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { referenceId } = await context.params;
  if (!isUuid(referenceId)) {
    return jsonError("payout not found", 404);
  }

  const parsed = await readJsonBody(request);
  const body = parsed.ok ? asRecord(parsed.body) : null;
  const financialTransactionId =
    typeof body?.financialTransactionId === "string"
      ? body.financialTransactionId
      : null;

  const result = await applyMomoCallback(
    referenceId,
    body?.status,
    financialTransactionId,
  );
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData(result.result);
}
