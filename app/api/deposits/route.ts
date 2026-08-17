import { jsonData, jsonError, readJsonBody } from "@/lib/http";
import { ingestDeposit, parseDepositEvent } from "@/lib/deposits";
import { authorizeIngest } from "@/lib/ingest-auth";

export async function POST(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return jsonError(auth.reason, auth.status);
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError("invalid request body", 400);
  }

  const event = parseDepositEvent(parsed.body);
  if (!event.ok) {
    return jsonError(event.reason, 400);
  }

  const result = await ingestDeposit(event.event);
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData(result.result, result.result.replay ? 200 : 201);
}
