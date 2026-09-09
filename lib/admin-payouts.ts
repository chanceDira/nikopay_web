import { toNumber } from "@/lib/numbers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PayoutTransferRow } from "@/lib/supabase/types";

const ADMIN_LIMIT = 200;

export const ADMIN_PAYOUT_STATUSES = [
  "pending",
  "enqueued",
  "successful",
  "failed",
] as const;

export type AdminPayoutStatus = (typeof ADMIN_PAYOUT_STATUSES)[number];

export type AdminPayout = {
  id: string;
  intentId: string;
  referenceId: string;
  amountRwf: number;
  msisdn: string;
  country: string;
  currency: string;
  provider: string | null;
  status: AdminPayoutStatus;
  rail: "pawapay";
  providerRef: string | null;
  providerReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export function isAdminPayoutStatus(
  value: string | null,
): value is AdminPayoutStatus {
  return (
    typeof value === "string" &&
    (ADMIN_PAYOUT_STATUSES as readonly string[]).includes(value)
  );
}

export function toAdminPayout(row: PayoutTransferRow): AdminPayout | null {
  const amountRwf = toNumber(row.amount);
  if (!Number.isFinite(amountRwf) || amountRwf < 0) {
    return null;
  }

  if (!(ADMIN_PAYOUT_STATUSES as readonly string[]).includes(row.status)) {
    return null;
  }

  return {
    id: row.id,
    intentId: row.intent_id,
    referenceId: row.payout_id,
    amountRwf,
    msisdn: row.msisdn,
    country: row.country,
    currency: row.currency,
    provider: row.provider,
    status: row.status,
    rail: "pawapay",
    providerRef: row.provider_ref,
    providerReason: row.provider_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAdminPayouts(): Promise<
  { ok: true; payouts: AdminPayout[] } | { ok: false; reason: string }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payout_transfers")
    .select()
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIMIT);

  if (error) {
    return { ok: false, reason: "unable to load payouts" };
  }

  const payouts: AdminPayout[] = [];
  for (const row of data ?? []) {
    const payout = toAdminPayout(row);
    if (payout) {
      payouts.push(payout);
    }
  }

  return { ok: true, payouts };
}
