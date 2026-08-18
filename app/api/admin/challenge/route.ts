import { jsonData, jsonError } from "@/lib/http";
import {
  buildAdminChallenge,
  getAdminHmacSecret,
} from "@/lib/admin-auth";
import { loadActiveTreasuryAddresses } from "@/lib/treasury";

export async function GET() {
  const secret = getAdminHmacSecret();
  if (!secret) {
    return jsonError("admin is not configured", 503);
  }

  const treasuries = await loadActiveTreasuryAddresses();
  if (!treasuries.ok) {
    return jsonError(treasuries.reason, 503);
  }

  return jsonData({
    message: buildAdminChallenge(secret),
    treasuries: treasuries.addresses,
  });
}
