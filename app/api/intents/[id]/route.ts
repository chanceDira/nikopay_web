import { jsonData, jsonError, isUuid } from "@/lib/http";
import { getPaymentIntent } from "@/lib/intents";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isUuid(id)) {
    return jsonError("payment intent not found", 404);
  }

  const result = await getPaymentIntent(id);
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData(result.intent);
}
