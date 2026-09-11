import { jsonData, jsonError, readJsonBody, asRecord } from "@/lib/http";
import { authorizeAdmin } from "@/lib/admin-auth";
import { createCheckoutLink, listCheckoutLinks } from "@/lib/checkouts";

export async function GET(request: Request) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  const result = await listCheckoutLinks();
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ checkouts: result.checkouts });
}

export async function POST(request: Request) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError("invalid request body", 400);
  }

  const body = asRecord(parsed.body);
  if (!body) {
    return jsonError("invalid request body", 400);
  }

  const result = await createCheckoutLink({
    label: body.label,
    usdtAmount: body.usdtAmount,
    country: body.country,
    currency: body.currency,
    provider: body.provider,
    msisdn: body.msisdn,
    expiresHours: body.expiresHours,
    createdBy: admin.address,
  });

  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ checkout: result.checkout }, 201);
}
