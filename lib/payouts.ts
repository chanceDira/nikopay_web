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
