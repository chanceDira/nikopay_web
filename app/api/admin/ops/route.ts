import { jsonData, jsonError } from "@/lib/http";
import { scanDeposits, parseScanChain } from "@/lib/scan-deposits";
import { runPayouts } from "@/lib/payouts";

function adminSession(request: Request): boolean {
  return request.headers.get("x-admin-session") === "true";
}

export async function POST(request: Request) {
  if (!adminSession(request)) return jsonError("unauthorized", 401);

  const params = new URL(request.url).searchParams;
  const op = params.get("op");

  if (op === "scan") {
    const chain = parseScanChain(params.get("chain"));
    if (!chain.ok) return jsonError(chain.reason, 400);
    const scans = await scanDeposits(chain.chain);
    return jsonData({ scans });
  }

  if (op === "payouts") {
    const result = await runPayouts();
    if (!result.ok) return jsonError(result.reason, 503);
    return jsonData({ payouts: result.payouts });
  }

  return jsonError("op must be scan or payouts", 400);
}
