import { jsonData, jsonError } from "@/lib/http";
import { buildAdminChallenge, getAdminHmacSecret } from "@/lib/admin-auth";
import { loadAdminWalletAddresses } from "@/lib/admin-wallets";

export async function GET() {
  const secret = getAdminHmacSecret();
  if (!secret) {
    return jsonError("admin is not configured", 503);
  }

  const admins = await loadAdminWalletAddresses();
  if (!admins.ok) return jsonError(admins.reason, 503);

  return jsonData({
    message: buildAdminChallenge(secret),
    admins: admins.addresses,
  });
}
