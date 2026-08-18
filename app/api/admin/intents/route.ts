import { jsonData, jsonError } from "@/lib/http";
import { authorizeAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { toPaymentIntent } from "@/lib/intents";
import type { PaymentIntent } from "@/lib/settlement/types";

const ADMIN_LIMIT = 200;

export async function GET(request: Request) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .select()
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIMIT);

  if (error) {
    return jsonError("unable to load intents", 503);
  }

  const intents: PaymentIntent[] = [];
  for (const row of data ?? []) {
    const intent = toPaymentIntent(row);
    if (intent) intents.push(intent);
  }

  return jsonData(intents);
}
