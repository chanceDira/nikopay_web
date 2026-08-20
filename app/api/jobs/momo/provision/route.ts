import { jsonData, jsonError } from "@/lib/http";
import { authorizeIngest } from "@/lib/ingest-auth";
import {
  callbackHostFromUrl,
  provisionSandboxApiUser,
} from "@/lib/momo/client";

export async function POST(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return jsonError(auth.reason, auth.status);
  }

  if (
    (process.env.MOMO_TARGET_ENVIRONMENT?.trim() || "sandbox") !== "sandbox"
  ) {
    return jsonError("provision is sandbox only", 409);
  }

  const callbackHost =
    callbackHostFromUrl(process.env.MOMO_CALLBACK_URL) ||
    callbackHostFromUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    "nikopay.local";

  const result = await provisionSandboxApiUser({
    callbackHost,
  });
  if (!result.ok) {
    return jsonError(result.reason, 503);
  }

  return jsonData({ ...result, callbackHost });
}
