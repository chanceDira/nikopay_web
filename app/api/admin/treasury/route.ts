import { jsonData, jsonError } from "@/lib/http";
import { authorizeAdmin } from "@/lib/admin-auth";
import { loadAdminTreasurySnapshot } from "@/lib/admin-treasury";

export async function GET(request: Request) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  const snapshot = await loadAdminTreasurySnapshot();
  return jsonData(snapshot);
}
