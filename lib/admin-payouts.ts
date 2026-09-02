import { toNumber } from "@/lib/numbers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MomoTransferRow, PayoutTransferRow } from "@/lib/supabase/types";

const ADMIN_LIMIT = 200;

export const MOMO_PAYOUT_STATUSES = [
  "pending",
  "successful",
  "failed",
  "timeout",
] as const;

export const PAWAPAY_PAYOUT_STATUSES = [
  "pending",
  "enqueued",
  "successful",
  "failed",
] as const;

export const ADMIN_PAYOUT_STATUSES = [
  "pending",
  "enqueued",
  "successful",
  "failed",
  "timeout",
] as const;

export type MomoPayoutStatus = (typeof MOMO_PAYOUT_STATUSES)[number];
export type PawapayPayoutStatus = (typeof PAWAPAY_PAYOUT_STATUSES)[number];
export type AdminPayoutStatus = (typeof ADMIN_PAYOUT_STATUSES)[number];

export type AdminPayout = {
  id: string;
  intentId: string;
  referenceId: string;
  amountRwf: number;
  msisdn: string;
  status: AdminPayoutStatus;
  rail: "momo" | "pawapay";
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

export function isAdminPayoutStatus(
  value: string | null,
): value is AdminPayoutStatus {
  return (
    typeof value === "string" &&
    (ADMIN_PAYOUT_STATUSES as readonly string[]).includes(value)
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
    rail: "momo",
    providerRef: row.provider_ref,
    providerReason: row.provider_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAdminPawapayPayout(row: PayoutTransferRow): AdminPayout | null {
  const amountRwf = toNumber(row.amount);
  if (!Number.isFinite(amountRwf) || amountRwf < 0) {
    return null;
  }

  if (!(PAWAPAY_PAYOUT_STATUSES as readonly string[]).includes(row.status)) {
    return null;
  }

  return {
    id: row.id,
    intentId: row.intent_id,
    referenceId: row.payout_id,
    amountRwf,
    msisdn: row.msisdn,
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
  const [momoResult, pawapayResult] = await Promise.all([
    supabase
      .from("momo_transfers")
      .select()
      .order("created_at", { ascending: false })
      .limit(ADMIN_LIMIT),
    supabase
      .from("payout_transfers")
      .select()
      .order("created_at", { ascending: false })
      .limit(ADMIN_LIMIT),
  ]);

  if (momoResult.error || pawapayResult.error) {
    return { ok: false, reason: "unable to load payouts" };
  }

  const payouts: AdminPayout[] = [];
  for (const row of momoResult.data ?? []) {
    const payout = toAdminPayout(row);
    if (payout) {
      payouts.push(payout);
    }
  }
  for (const row of pawapayResult.data ?? []) {
    const payout = toAdminPawapayPayout(row);
    if (payout) {
      payouts.push(payout);
    }
  }

  payouts.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  return { ok: true, payouts: payouts.slice(0, ADMIN_LIMIT) };
}
