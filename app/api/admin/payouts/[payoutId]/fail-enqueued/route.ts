import { jsonData, jsonError, isUuid } from "@/lib/http";
import { authorizeAdmin } from "@/lib/admin-auth";
import { cancelEnqueuedPayout } from "@/lib/pawapay/fail-enqueued";

type RouteContext = { params: Promise<{ payoutId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  const { payoutId } = await context.params;
  if (!isUuid(payoutId)) {
    return jsonError("not found", 404);
  }

  const result = await cancelEnqueuedPayout({
    payoutId,
    actor: admin.address,
  });
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ payoutId, status: result.status });
}
