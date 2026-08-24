import {
  asRecord,
  jsonData,
  jsonError,
  parseUsdtAmount,
  readJsonBody,
} from "@/lib/http";
import { createServerQuote } from "@/lib/quotes";

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError("invalid request body", 400);
  }

  const body = asRecord(parsed.body);
  if (!body) {
    return jsonError("invalid request body", 400);
  }

  const amount = parseUsdtAmount(body.usdtAmount);
  if (!amount.ok) {
    return jsonError(amount.reason, 400);
  }

  const result = await createServerQuote(amount.amount, body.chain);
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData(result.quote, 201);
}
