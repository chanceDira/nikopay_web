import { jsonData, jsonError } from "@/lib/http";
import { authorizeAdmin } from "@/lib/admin-auth";
import { parseScanChain, scanDeposits } from "@/lib/scan-deposits";
import { runPayouts } from "@/lib/payouts";

export async function POST(request: Request) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) return jsonError(admin.reason, admin.status);

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
    if (!result.ok) return jsonError(result.reason, result.status);
    return jsonData({ payouts: result.payouts });
  }

  return jsonError("op must be scan or payouts", 400);
}
