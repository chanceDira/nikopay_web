import { jsonData, jsonError } from "@/lib/http";
import { applyPayoutCallback } from "@/lib/pawapay/callback";
import { getPublicKeys } from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";
import { settlePayout } from "@/lib/pawapay/settle";
import { verifyCallbackSignature } from "@/lib/pawapay/signatures";

export async function POST(request: Request) {
  const configured = getPawapayConfig();
  if (!configured.ok) {
    return jsonError(configured.reason, 503);
  }

  const rawBody = await request.text();

  if (configured.config.verifyCallbacks) {
    const keys = await getPublicKeys(configured.config);
    if (!keys.ok) {
      return jsonError("unable to verify callback", 503);
    }

    const verified = verifyCallbackSignature({
      method: request.method,
      url: request.url,
      headers: request.headers,
      rawBody,
      keys: keys.data,
    });
    if (!verified.ok) {
      return jsonError("unauthorized", 401);
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return jsonError("callback payload is invalid", 400);
  }

  const result = await applyPayoutCallback(body);
  if (!result.ok) {
    const status = result.reason === "payout not found" ? 404 : 400;
    return jsonError(result.reason, status);
  }

  const { payoutId, status } = result.outcome;
  if (status === "successful" || status === "failed") {
    await settlePayout(payoutId);
  }

  return jsonData(result.outcome);
}
