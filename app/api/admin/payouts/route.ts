import { jsonData, jsonError } from "@/lib/http";
import { authorizeAdmin } from "@/lib/admin-auth";
import { listAdminPayouts } from "@/lib/admin-payouts";

export async function GET(request: Request) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  const result = await listAdminPayouts();
  if (!result.ok) {
    return jsonError(result.reason, 503);
  }

  return jsonData(result.payouts);
}
