import { jsonData, jsonError, isUuid } from "@/lib/http";
import { authorizeAdmin } from "@/lib/admin-auth";
import { loadLivePawapayPayout } from "@/lib/admin-pawapay";

type RouteContext = { params: Promise<{ payoutId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  const { payoutId } = await context.params;
  if (!isUuid(payoutId)) {
    return jsonError("payout id is invalid", 400);
  }

  const result = await loadLivePawapayPayout(payoutId);
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData(result.data);
}
