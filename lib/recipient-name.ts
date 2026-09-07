import { getMomoLookupConfig } from "@/lib/momo/config";
import { lookupMomoHolderName } from "@/lib/momo/name-lookup";

export const RWANDA_MTN_PROVIDER = "MTN_MOMO_RWA";
export const RWANDA_AIRTEL_PROVIDER = "AIRTEL_RWA";

export type RecipientNamePreview = {
  status: "found" | "not_found" | "unavailable";
  displayName: string | null;
  source: "mtn" | null;
};

export function canLookupRecipientName(
  country: string,
  provider: string,
): boolean {
  return (
    country.trim().toUpperCase() === "RWA" &&
    provider.trim().toUpperCase() === RWANDA_MTN_PROVIDER
  );
}

export async function previewRecipientName(input: {
  country: string;
  provider: string;
  msisdn: string;
}): Promise<RecipientNamePreview> {
  const country = input.country.trim().toUpperCase();
  const provider = input.provider.trim().toUpperCase();

  if (country !== "RWA") {
    return {
      status: "unavailable",
      displayName: null,
      source: null,
    };
  }

  if (provider === RWANDA_AIRTEL_PROVIDER) {
    return {
      status: "unavailable",
      displayName: null,
      source: null,
    };
  }

  if (provider !== RWANDA_MTN_PROVIDER) {
    return {
      status: "unavailable",
      displayName: null,
      source: null,
    };
  }

  if (!input.msisdn.startsWith("250")) {
    return {
      status: "unavailable",
      displayName: null,
      source: "mtn",
    };
  }

  const configured = getMomoLookupConfig();
  if (!configured.ok) {
    return {
      status: "unavailable",
      displayName: null,
      source: "mtn",
    };
  }

  const lookedUp = await lookupMomoHolderName(configured.config, input.msisdn);
  if (lookedUp.ok) {
    return {
      status: "found",
      displayName: lookedUp.name,
      source: "mtn",
    };
  }

  return {
    status: lookedUp.reason === "not_found" ? "not_found" : "unavailable",
    displayName: null,
    source: "mtn",
  };
}
