import {
  asRecord,
  jsonData,
  jsonError,
  isUuid,
  readJsonBody,
} from "@/lib/http";
import { getPaymentIntent, toPaymentIntent } from "@/lib/intents";
import { isPaymentStatus } from "@/lib/settlement/intent-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeTxHash } from "@/lib/identity";
import type { PaymentStatus } from "@/lib/settlement/types";

type IntentPatch = {
  status?: PaymentStatus;
  deposit_tx?: string | null;
  momo_ref?: string | null;
};

type RouteContext = { params: Promise<{ id: string }> };

function adminSession(request: Request): boolean {
  return request.headers.get("x-admin-session") === "true";
}

export async function GET(request: Request, context: RouteContext) {
  if (!adminSession(request)) return jsonError("unauthorized", 401);

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("not found", 404);

  const result = await getPaymentIntent(id);
  if (!result.ok) return jsonError(result.reason, result.status);

  return jsonData(result.intent);
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!adminSession(request)) return jsonError("unauthorized", 401);

  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("not found", 404);

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return jsonError("invalid request body", 400);

  const body = asRecord(parsed.body);
  if (!body) return jsonError("invalid request body", 400);

  const patch: IntentPatch = {};

  if (body.status !== undefined) {
    if (!isPaymentStatus(body.status))
      return jsonError("invalid status", 400);
    patch.status = body.status;
  }

  if (body.depositTx !== undefined) {
    if (body.depositTx === null || body.depositTx === "") {
      patch.deposit_tx = null;
    } else {
      const tx = normalizeTxHash(body.depositTx);
      if (!tx.ok) return jsonError(tx.reason, 400);
      patch.deposit_tx = tx.txHash;
    }
  }

  if (body.momoRef !== undefined) {
    if (body.momoRef === null || body.momoRef === "") {
      patch.momo_ref = null;
    } else {
      if (typeof body.momoRef !== "string")
        return jsonError("momo ref must be a string", 400);
      patch.momo_ref = body.momoRef;
    }
  }

  if (Object.keys(patch).length === 0)
    return jsonError("nothing to update", 400);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return jsonError("unable to update intent", 503);
  if (!data) return jsonError("not found", 404);

  const intent = toPaymentIntent(data);
  if (!intent) return jsonError("unable to load intent", 503);

  return jsonData(intent);
}
