import { jsonData, jsonError, isUuid } from "@/lib/http";
import { listAdminAuditForIntent } from "@/lib/admin-audit";
import { authorizeAdmin } from "@/lib/admin-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("not found", 404);
  }

  const result = await listAdminAuditForIntent(id);
  if (!result.ok) {
    return jsonError(result.reason, 503);
  }

  return jsonData(result.entries);
}
