import { isUuid } from "@/lib/http";
import { runPawapayPayouts } from "@/lib/pawapay/payouts";
import type { PaymentIntent } from "@/lib/settlement/types";
import type { MomoTransferRow } from "@/lib/supabase/types";

export type PayoutRunResult = {
  intentId: string;
  referenceId: string;
  momoStatus: MomoTransferRow["status"];
  intentStatus: PaymentIntent["status"];
};

export async function runPayouts(
  intentId?: string,
): Promise<
  | { ok: true; payouts: PayoutRunResult[] }
  | { ok: false; reason: string; status: number }
> {
  return runPawapayPayouts(intentId);
}

export function parsePayoutIntentId(
  value: string | null,
): { ok: true; intentId?: string } | { ok: false; reason: string } {
  if (value === null || value === "") {
    return { ok: true };
  }
  if (!isUuid(value)) {
    return { ok: false, reason: "payment intent not found" };
  }
  return { ok: true, intentId: value };
}
