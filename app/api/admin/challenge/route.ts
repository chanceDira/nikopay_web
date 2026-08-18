import { jsonData, jsonError } from "@/lib/http";
import {
  buildAdminChallenge,
  getAdminHmacSecret,
} from "@/lib/admin-auth";

export async function GET() {
  const secret = getAdminHmacSecret();
  if (!secret) {
    return jsonError("admin is not configured", 503);
  }

  return jsonData({ message: buildAdminChallenge(secret) });
}
