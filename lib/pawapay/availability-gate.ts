import {
  flattenDepositAvailability,
  flattenPayoutAvailability,
  payoutAvailabilityStatus,
} from "@/lib/pawapay/availability";
import { getAvailability } from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";

export async function assertPayoutProviderOpen(
  country: string,
  provider: string,
): Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  return assertProviderOpen(country, provider, "PAYOUT", "payout");
}

export async function assertDepositProviderOpen(
  country: string,
  provider: string,
): Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  return assertProviderOpen(country, provider, "DEPOSIT", "deposit");
}

async function assertProviderOpen(
  country: string,
  provider: string,
  operationType: "PAYOUT" | "DEPOSIT",
  label: "payout" | "deposit",
): Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  const configured = getPawapayConfig();
  if (!configured.ok) {
    return { ok: true };
  }

  const availability = await getAvailability(configured.config, {
    country,
    operationType,
  });
  if (!availability.ok) {
    return { ok: true };
  }

  const rows =
    operationType === "PAYOUT"
      ? flattenPayoutAvailability(availability.data)
      : flattenDepositAvailability(availability.data);
  const status = payoutAvailabilityStatus(rows, country, provider);
  if (status === "CLOSED") {
    return {
      ok: false,
      reason: `${label} provider is currently closed`,
      status: 409,
    };
  }

  return { ok: true };
}
