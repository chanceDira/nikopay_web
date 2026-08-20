import { toNumber } from "@/lib/numbers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MomoTransferRow } from "@/lib/supabase/types";

const ADMIN_LIMIT = 200;

export const MOMO_PAYOUT_STATUSES = [
  "pending",
  "successful",
  "failed",
  "timeout",
] as const;

export type MomoPayoutStatus = (typeof MOMO_PAYOUT_STATUSES)[number];

export type AdminPayout = {
  id: string;
  intentId: string;
  referenceId: string;
  amountRwf: number;
  msisdn: string;
  status: MomoPayoutStatus;
  providerRef: string | null;
  providerReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export function isMomoPayoutStatus(
  value: string | null,
): value is MomoPayoutStatus {
  return (
    typeof value === "string" &&
    (MOMO_PAYOUT_STATUSES as readonly string[]).includes(value)
  );
}

export function toAdminPayout(row: MomoTransferRow): AdminPayout | null {
  const amountRwf = toNumber(row.amount_rwf);
  if (!Number.isFinite(amountRwf) || amountRwf < 0) {
    return null;
  }

  return {
    id: row.id,
    intentId: row.intent_id,
    referenceId: row.reference_id,
    amountRwf,
    msisdn: row.msisdn,
    status: row.status,
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
    .from("momo_transfers")
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
