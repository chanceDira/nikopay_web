import { jsonData, jsonError, readJsonBody, asRecord } from "@/lib/http";
import { authorizeAdmin } from "@/lib/admin-auth";
import { createCollection, listCollections } from "@/lib/collections";

export async function GET(request: Request) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  const result = await listCollections();
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ collections: result.collections });
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

  const result = await createCollection({
    label: body.label,
    country: body.country,
    currency: body.currency,
    provider: body.provider,
    msisdn: body.msisdn,
    amount: body.amount,
    createdBy: admin.address,
  });

  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ collection: result.collection }, 201);
}
