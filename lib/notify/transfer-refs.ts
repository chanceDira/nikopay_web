import { createAdminClient } from "@/lib/supabase/admin";

export type PaidRefs = {
  referenceId: string | null;
  providerRef: string | null;
};

export type FailedRefs = {
  referenceId: string;
  status: "failed" | "timeout";
  providerReason: string | null;
};

export async function loadPaidRefs(intentId: string): Promise<PaidRefs> {
  const supabase = createAdminClient();

  const momo = await supabase
    .from("momo_transfers")
    .select("reference_id, provider_ref")
    .eq("intent_id", intentId)
    .eq("status", "successful")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (momo.data) {
    return {
      referenceId: momo.data.reference_id,
      providerRef: momo.data.provider_ref,
    };
  }

  const payout = await supabase
    .from("payout_transfers")
    .select("payout_id, provider_ref")
    .eq("intent_id", intentId)
    .eq("status", "successful")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (payout.data) {
    return {
      referenceId: payout.data.payout_id,
      providerRef: payout.data.provider_ref,
    };
  }

  return { referenceId: null, providerRef: null };
}

export async function loadFailedRefs(
  intentId: string,
): Promise<FailedRefs | null> {
  const supabase = createAdminClient();

  const momo = await supabase
    .from("momo_transfers")
    .select("reference_id, status, provider_reason")
    .eq("intent_id", intentId)
    .in("status", ["failed", "timeout"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const momoStatus = momo.data?.status;
  if (momo.data && (momoStatus === "failed" || momoStatus === "timeout")) {
    return {
      referenceId: momo.data.reference_id,
      status: momoStatus,
      providerReason: momo.data.provider_reason,
    };
  }

  const payout = await supabase
    .from("payout_transfers")
    .select("payout_id, provider_reason")
    .eq("intent_id", intentId)
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (payout.data) {
    return {
      referenceId: payout.data.payout_id,
      status: "failed",
      providerReason: payout.data.provider_reason,
    };
  }

  return null;
}
