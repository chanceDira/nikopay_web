import type { PawapayConfig } from "@/lib/pawapay/config";
import { predictProvider } from "@/lib/pawapay/client";
import type { PredictProviderResponse } from "@/lib/pawapay/types";

export const SANDBOX_SUCCESS_MSISDN = "250783456789";
export const SANDBOX_FAILURE_MSISDN = "250783456089";

export type SandboxProvider = {
  country: string;
  provider: string;
  phoneNumber: string;
};

export function sandboxProviderOverride(
  phoneNumber: string,
  baseUrl: string,
): SandboxProvider | null {
  if (!baseUrl.includes("sandbox.pawapay.io")) {
    return null;
  }

  if (phoneNumber === SANDBOX_FAILURE_MSISDN) {
    return {
      country: "RWA",
      provider: "MTN_MOMO_RWA",
      phoneNumber,
    };
  }

  return null;
}

type FetchLike = typeof fetch;

export async function resolvePayoutProvider(
  config: PawapayConfig,
  phoneNumber: string,
  fetchImpl: FetchLike = fetch,
): Promise<
  { ok: true; data: PredictProviderResponse } | { ok: false; reason: string }
> {
  const override = sandboxProviderOverride(phoneNumber, config.baseUrl);
  if (override) {
    return { ok: true, data: override };
  }

  return predictProvider(config, phoneNumber, fetchImpl);
}
