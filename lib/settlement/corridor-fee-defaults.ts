import {
  DEFAULT_MNO_FIXED,
  DEFAULT_PAWAPAY_PERCENT,
  type CorridorFees,
} from "@/lib/settlement/quote";

export const RWANDA_COUNTRY = "RWA";
export const RWANDA_CURRENCY = "RWF";
export const RWANDA_MTN_PROVIDER = "MTN_MOMO_RWA";
export const RWANDA_MTN_MNO_FIXED = 60;

export function fallbackCorridorFees(input: {
  currency: string;
  nikopayPercent: number;
  country?: string;
  provider?: string;
}): CorridorFees {
  const nikopayPercent = input.nikopayPercent;
  const currency = input.currency.trim().toUpperCase();
  const country = input.country?.trim().toUpperCase() ?? "";
  const provider = input.provider?.trim().toUpperCase() ?? "";

  if (currency === RWANDA_CURRENCY || country === RWANDA_COUNTRY) {
    if (provider === RWANDA_MTN_PROVIDER) {
      return {
        pawapayPercent: DEFAULT_PAWAPAY_PERCENT,
        mnoFixed: RWANDA_MTN_MNO_FIXED,
        nikopayPercent,
      };
    }
    return {
      pawapayPercent: DEFAULT_PAWAPAY_PERCENT,
      mnoFixed: DEFAULT_MNO_FIXED,
      nikopayPercent,
    };
  }

  return {
    pawapayPercent: DEFAULT_PAWAPAY_PERCENT,
    mnoFixed: DEFAULT_MNO_FIXED,
    nikopayPercent,
  };
}

export function defaultCountryForCurrency(
  currency: string,
  country?: string,
): string | undefined {
  const explicit = country?.trim().toUpperCase();
  if (explicit) {
    return explicit;
  }
  if (currency.trim().toUpperCase() === RWANDA_CURRENCY) {
    return RWANDA_COUNTRY;
  }
  return undefined;
}
