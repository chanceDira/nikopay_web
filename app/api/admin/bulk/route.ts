import { jsonData, jsonError, readJsonBody, asRecord } from "@/lib/http";
import { authorizeAdmin } from "@/lib/admin-auth";
import { createBulkPayout, listBulkPayouts } from "@/lib/bulk-payouts";

export async function GET(request: Request) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  const result = await listBulkPayouts();
  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ batches: result.batches });
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

  const result = await createBulkPayout({
    label: body.label,
    country: body.country,
    currency: body.currency,
    provider: body.provider,
    items: body.items,
    createdBy: admin.address,
  });

  if (!result.ok) {
    return jsonError(result.reason, result.status);
  }

  return jsonData({ batch: result.batch }, 201);
}
