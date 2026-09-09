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
