import { normalizeCorridorCurrency } from "@/lib/corridor";

export const DEFAULT_FX_CURRENCY = "RWF";

export function mergeFxCurrencies(
  corridorCurrencies: readonly string[],
  rateCurrencies: readonly string[],
  preferred: string = DEFAULT_FX_CURRENCY,
): string[] {
  const seen = new Set<string>();
  for (const raw of [...corridorCurrencies, ...rateCurrencies, preferred]) {
    const parsed = normalizeCorridorCurrency(raw);
    if (parsed.ok) {
      seen.add(parsed.currency);
    }
  }

  const rest = [...seen].filter((code) => code !== preferred).sort();
  return seen.has(preferred) ? [preferred, ...rest] : rest;
}

export function latestRateForCurrency<T extends { currency: string }>(
  rows: readonly T[],
  currency: string,
): T | undefined {
  return rows.find((row) => row.currency === currency);
}

export function currentRatesByCurrency<
  T extends { currency: string; effectiveFrom: string },
>(rows: readonly T[], preferred: string = DEFAULT_FX_CURRENCY): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const existing = latest.get(row.currency);
    if (!existing || row.effectiveFrom > existing.effectiveFrom) {
      latest.set(row.currency, row);
    }
  }

  return [...latest.values()].sort((left, right) => {
    if (left.currency === preferred) {
      return -1;
    }
    if (right.currency === preferred) {
      return 1;
    }
    return left.currency.localeCompare(right.currency);
  });
}
