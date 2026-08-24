import { jsonData, jsonError } from "@/lib/http";
import { authorizeIngest } from "@/lib/ingest-auth";
import { parsePayoutIntentId, runPayouts } from "@/lib/payouts";

export async function POST(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return jsonError(auth.reason, auth.status);
  }

  const intent = parsePayoutIntentId(
    new URL(request.url).searchParams.get("intent"),
  );
  if (!intent.ok) {
    return jsonError(intent.reason, 404);
  }

  const result = await runPayouts(intent.intentId);
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ payouts: result.payouts });
}
