import { createAdminClient } from "@/lib/supabase/admin";
import type { PayoutTransferRow } from "@/lib/supabase/types";

export type PayoutTransferInsert = {
  intentId: string;
  payoutId: string;
  country: string;
  currency: string;
  provider: string;
  msisdn: string;
  amount: number;
};

export type PayoutTransferPatch = {
  status: PayoutTransferRow["status"];
  providerRef?: string | null;
  providerReason?: string | null;
};

export async function loadIntentStatus(
  intentId: string,
): Promise<{ ok: true; status: string } | { ok: false; reason: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .select("status")
    .eq("id", intentId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unable to load payment intent" };
  }
  if (!data) {
    return { ok: false, reason: "payment intent not found" };
  }

  return { ok: true, status: data.status };
}

export async function loadPayoutTransfer(
  payoutId: string,
): Promise<
  { ok: true; row: PayoutTransferRow | null } | { ok: false; reason: string }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payout_transfers")
    .select()
    .eq("payout_id", payoutId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unable to load payout" };
  }

  return { ok: true, row: data };
}

export async function loadOpenPayoutTransfers(
  limit: number,
): Promise<
  { ok: true; rows: PayoutTransferRow[] } | { ok: false; reason: string }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payout_transfers")
    .select()
    .in("status", ["pending", "enqueued"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return { ok: false, reason: "unable to load open payouts" };
  }

  return { ok: true, rows: data ?? [] };
}

export async function loadLatestPayoutTransfer(
  intentId: string,
): Promise<
  { ok: true; row: PayoutTransferRow | null } | { ok: false; reason: string }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payout_transfers")
    .select()
    .eq("intent_id", intentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unable to load payout" };
  }

  return { ok: true, row: data };
}

export async function insertPayoutTransfer(
  row: PayoutTransferInsert,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = createAdminClient();
  const inserted = await supabase.from("payout_transfers").insert({
    intent_id: row.intentId,
    payout_id: row.payoutId,
    country: row.country,
    currency: row.currency,
    provider: row.provider,
    msisdn: row.msisdn,
    amount: row.amount,
    status: "pending",
  });

  if (inserted.error) {
    return { ok: false, reason: "unable to persist payout" };
  }

  return { ok: true };
}

export async function updatePayoutTransfer(
  payoutId: string,
  patch: PayoutTransferPatch,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = createAdminClient();
  const updated = await supabase
    .from("payout_transfers")
    .update({
      status: patch.status,
      provider_ref: patch.providerRef ?? null,
      provider_reason: patch.providerReason ?? null,
    })
    .eq("payout_id", payoutId);

  if (updated.error) {
    return { ok: false, reason: "unable to update payout" };
  }

  return { ok: true };
}
