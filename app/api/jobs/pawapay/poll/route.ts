import { jsonData, jsonError } from "@/lib/http";
import { authorizeIngest } from "@/lib/ingest-auth";
import { getPawapayConfig } from "@/lib/pawapay/config";
import {
  runCollectionPoll,
  runPawapayPoll,
  runRemittancePoll,
} from "@/lib/pawapay/poll";

export async function POST(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return jsonError(auth.reason, auth.status);
  }

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return jsonError(configured.reason, 503);
  }

  const payouts = await runPawapayPoll({ config: configured.config });
  if (!payouts.ok) {
    return jsonError(payouts.reason, 503);
  }

  const deposits = await runCollectionPoll({ config: configured.config });
  if (!deposits.ok) {
    return jsonError(deposits.reason, 503);
  }

  const remittances = await runRemittancePoll({ config: configured.config });
  if (!remittances.ok) {
    return jsonError(remittances.reason, 503);
  }

  return jsonData({
    polled: payouts.polled,
    deposits: deposits.polled,
    remittances: remittances.polled,
  });
}
