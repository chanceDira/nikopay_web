import {
  asRecord,
  jsonData,
  jsonError,
  parseUsdtAmount,
  readJsonBody,
} from "@/lib/http";
import { createPaymentIntent, listPaymentIntents } from "@/lib/intents";

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

  const result = await createPaymentIntent({
    usdtAmount: amount.amount,
    chain: body.chain,
    msisdn: body.msisdn,
    walletAddress: body.walletAddress,
    notifyEmail: body.notifyEmail,
  });

  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData(result.intent, 201);
}

export async function GET(request: Request) {
  const walletAddress = new URL(request.url).searchParams.get("wallet");
  const result = await listPaymentIntents(walletAddress);

  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  const masked = result.intents.map(
    ({ msisdn: _msisdn, notifyEmail: _notifyEmail, ...rest }) => rest,
  );

  return jsonData(masked);
}
