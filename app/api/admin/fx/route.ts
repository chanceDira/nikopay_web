import { jsonData, jsonError, readJsonBody, asRecord } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { toNumber } from "@/lib/numbers";

function adminSession(request: Request): boolean {
  return request.headers.get("x-admin-session") === "true";
}

export async function GET(request: Request) {
  if (!adminSession(request)) return jsonError("unauthorized", 401);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("fx_rates")
    .select("usdt_to_rwf, fee_percent, min_usdt, effective_from, created_at")
    .order("effective_from", { ascending: false })
    .limit(20);

  if (error) return jsonError("unable to load rates", 503);

  const rows = (data ?? []).map((r) => ({
    rate: toNumber(r.usdt_to_rwf),
    feePercent: toNumber(r.fee_percent),
    minUsdt: toNumber(r.min_usdt),
    effectiveFrom: r.effective_from,
    createdAt: r.created_at,
  }));

  return jsonData(rows);
}

export async function POST(request: Request) {
  if (!adminSession(request)) return jsonError("unauthorized", 401);

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return jsonError("invalid request body", 400);

  const body = asRecord(parsed.body);
  if (!body) return jsonError("invalid request body", 400);

  const rate = typeof body.rate === "number" ? body.rate : Number(body.rate);
  const feePercent =
    typeof body.feePercent === "number"
      ? body.feePercent
      : Number(body.feePercent);
  const minUsdt =
    typeof body.minUsdt === "number" ? body.minUsdt : Number(body.minUsdt);

  if (!Number.isFinite(rate) || rate <= 0)
    return jsonError("rate must be a positive number", 400);
  if (!Number.isFinite(feePercent) || feePercent < 0)
    return jsonError("fee percent must be zero or positive", 400);
  if (!Number.isFinite(minUsdt) || minUsdt <= 0)
    return jsonError("min usdt must be a positive number", 400);

  const supabase = createAdminClient();

  const now = new Date().toISOString();
  await supabase
    .from("fx_rates")
    .update({ effective_to: now })
    .is("effective_to", null);

  const { error } = await supabase.from("fx_rates").insert({
    usdt_to_rwf: rate,
    fee_percent: feePercent,
    min_usdt: minUsdt,
    effective_from: now,
  });

  if (error) return jsonError("unable to save rate", 503);

  return jsonData({ ok: true }, 201);
}
