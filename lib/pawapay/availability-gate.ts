import {
  flattenPayoutAvailability,
  payoutAvailabilityStatus,
} from "@/lib/pawapay/availability";
import { getAvailability } from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";

export async function assertPayoutProviderOpen(
  country: string,
  provider: string,
): Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  const configured = getPawapayConfig();
  if (!configured.ok) {
    return { ok: true };
  }

  const availability = await getAvailability(configured.config, {
    country,
    operationType: "PAYOUT",
  });
  if (!availability.ok) {
    return { ok: true };
  }

  const status = payoutAvailabilityStatus(
    flattenPayoutAvailability(availability.data),
    country,
    provider,
  );
  if (status === "CLOSED") {
    return {
      ok: false,
      reason: "payout provider is currently closed",
      status: 409,
    };
  }

  return { ok: true };
}
