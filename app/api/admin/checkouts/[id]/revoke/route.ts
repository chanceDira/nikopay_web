import { jsonData, jsonError } from "@/lib/http";
import { authorizeAdmin } from "@/lib/admin-auth";
import { isUuid } from "@/lib/identity";
import { revokeCheckoutLink } from "@/lib/checkouts";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonError("checkout not found", 404);
  }

  const result = await revokeCheckoutLink(id);
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ checkout: result.checkout });
}
