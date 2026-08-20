import { createAdminClient } from "@/lib/supabase/admin";
import { sendPaidEmail } from "@/lib/notify/email";
import { toNumber } from "@/lib/numbers";

/**
 * Send MoMo success email once per intent. Safe to call on every settle.
 * Does not log the email address.
 */
export async function notifyIntentPaid(intentId: string): Promise<void> {
  const supabase = createAdminClient();
  const loaded = await supabase
    .from("payment_intents")
    .select(
      "id, status, notify_email, paid_notified_at, net_rwf, usdt_amount, msisdn, momo_ref",
    )
    .eq("id", intentId)
    .maybeSingle();

  if (loaded.error || !loaded.data) {
    return;
  }

  const row = loaded.data;
  if (row.status !== "paid" || !row.notify_email || row.paid_notified_at) {
    return;
  }

  const sent = await sendPaidEmail({
    to: row.notify_email,
    intentId: row.id,
    netRwf: toNumber(row.net_rwf),
    usdtAmount: toNumber(row.usdt_amount),
    msisdn: row.msisdn,
    momoRef: row.momo_ref ?? undefined,
  });

  if (!sent.ok) {
    return;
  }

  await supabase
    .from("payment_intents")
    .update({ paid_notified_at: new Date().toISOString() })
    .eq("id", intentId)
    .eq("status", "paid")
    .is("paid_notified_at", null);
}
