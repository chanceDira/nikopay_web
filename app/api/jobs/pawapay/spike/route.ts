import { jsonData, jsonError } from "@/lib/http";
import { isUuid, normalizeMsisdn } from "@/lib/identity";
import { authorizeIngest } from "@/lib/ingest-auth";
import { getPawapayConfig } from "@/lib/pawapay/config";
import {
  runSandboxPayoutSpike,
  SANDBOX_SUCCESS_MSISDN,
} from "@/lib/pawapay/spike";

export async function POST(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return jsonError(auth.reason, auth.status);
  }

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return jsonError(configured.reason, 503);
  }
  if (!configured.config.baseUrl.includes("sandbox.pawapay.io")) {
    return jsonError("spike is sandbox only", 409);
  }

  const params = new URL(request.url).searchParams;
  const intentId = params.get("intent")?.trim() ?? "";
  if (!isUuid(intentId)) {
    return jsonError("payment intent not found", 404);
  }

  const rawMsisdn = params.get("msisdn") ?? SANDBOX_SUCCESS_MSISDN;
  const msisdn = normalizeMsisdn(rawMsisdn);
  if (!msisdn.ok) {
    return jsonError(msisdn.reason, 400);
  }

  const result = await runSandboxPayoutSpike({
    intentId,
    msisdn: msisdn.msisdn,
    config: configured.config,
  });
  if (!result.ok) {
    return jsonError(result.reason, 409);
  }

  return jsonData(result.result);
}
