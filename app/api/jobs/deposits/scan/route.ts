import { jsonData, jsonError } from "@/lib/http";
import { authorizeIngest } from "@/lib/ingest-auth";
import { parseScanChain, scanDeposits } from "@/lib/scan-deposits";

export async function POST(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return jsonError(auth.reason, auth.status);
  }

  const chain = parseScanChain(new URL(request.url).searchParams.get("chain"));
  if (!chain.ok) {
    return jsonError(chain.reason, 400);
  }

  const scans = await scanDeposits(chain.chain);
  return jsonData({ scans });
}
