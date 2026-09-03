const COUNTRY_REGEX = /^[A-Z]{3}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;
const PROVIDER_REGEX = /^[A-Z0-9_]{3,64}$/;

export function normalizeCorridorCountry(
  value: unknown,
): { ok: true; country: string } | { ok: false; reason: string } {
  if (typeof value !== "string") {
    return { ok: false, reason: "country is required" };
  }
  const country = value.trim().toUpperCase();
  if (!COUNTRY_REGEX.test(country)) {
    return { ok: false, reason: "country must be a 3-letter ISO code" };
  }
  return { ok: true, country };
}

export function normalizeCorridorCurrency(
  value: unknown,
): { ok: true; currency: string } | { ok: false; reason: string } {
  if (typeof value !== "string") {
    return { ok: false, reason: "currency is required" };
  }
  const currency = value.trim().toUpperCase();
  if (!CURRENCY_REGEX.test(currency)) {
    return { ok: false, reason: "currency must be a 3-letter ISO code" };
  }
  return { ok: true, currency };
}

export function normalizeCorridorProvider(
  value: unknown,
): { ok: true; provider: string } | { ok: false; reason: string } {
  if (typeof value !== "string") {
    return { ok: false, reason: "provider is required" };
  }
  const provider = value.trim().toUpperCase();
  if (!PROVIDER_REGEX.test(provider)) {
    return { ok: false, reason: "provider is invalid" };
  }
  return { ok: true, provider };
}
