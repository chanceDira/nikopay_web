import { jsonData, jsonError } from "@/lib/http";
import { authorizeAdmin } from "@/lib/admin-auth";
import { retryBulkPayout } from "@/lib/bulk-payouts";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  const { id } = await context.params;
  const result = await retryBulkPayout(id);
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ batch: result.batch });
}
