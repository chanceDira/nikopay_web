import { asRecord, jsonData, jsonError, readJsonBody } from "@/lib/http";
import {
  applyAdminCookie,
  authorizeAdmin,
  clearAdminCookie,
  createAdminCookieValue,
  getAdminHmacSecret,
  parseAdminChallenge,
  recoverTreasurySigner,
} from "@/lib/admin-auth";
import { loadActiveTreasuryAddresses } from "@/lib/treasury";

export async function GET(request: Request) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  return jsonData({ address: admin.address });
}

export async function POST(request: Request) {
  const secret = getAdminHmacSecret();
  if (!secret) {
    return jsonError("admin is not configured", 503);
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError("invalid request body", 400);
  }
  const body = asRecord(parsed.body);
  if (!body) {
    return jsonError("invalid request body", 400);
  }

  if (typeof body.message !== "string") {
    return jsonError("challenge is invalid", 400);
  }

  const challenge = parseAdminChallenge(body.message, secret);
  if (!challenge.ok) {
    return jsonError(challenge.reason, 401);
  }

  const signer = recoverTreasurySigner(body.message, body.signature);
  if (!signer.ok) {
    return jsonError(signer.reason, 401);
  }

  const treasuries = await loadActiveTreasuryAddresses();
  if (!treasuries.ok) {
    return jsonError(treasuries.reason, 503);
  }
  if (!treasuries.addresses.includes(signer.address)) {
    return jsonError("connected wallet is not the treasury", 403);
  }

  const response = jsonData({ address: signer.address });
  applyAdminCookie(response, createAdminCookieValue(signer.address, secret));
  return response;
}

export async function DELETE() {
  const response = jsonData({ ok: true });
  clearAdminCookie(response);
  return response;
}
