import { jsonData, jsonError } from "@/lib/http";
import { authorizeIngest } from "@/lib/ingest-auth";
import { getPawapayConfig } from "@/lib/pawapay/config";
import { runPawapayPoll } from "@/lib/pawapay/poll";

export async function POST(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return jsonError(auth.reason, auth.status);
  }

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return jsonError(configured.reason, 503);
  }

  const result = await runPawapayPoll({ config: configured.config });
  if (!result.ok) {
    return jsonError(result.reason, 503);
  }

  return jsonData({ polled: result.polled });
}
