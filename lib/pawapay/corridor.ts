import { asRecord } from "@/lib/http";
import { asAmountDecimals, type AmountDecimals } from "@/lib/pawapay/amount";

export type PayoutCorridor = {
  country: string;
  provider: string;
  currency: string;
  decimalsInAmount: AmountDecimals;
  minAmount: string;
  maxAmount: string;
};

export function pickPayoutCorridor(
  conf: unknown,
  query: { country: string; provider: string },
): PayoutCorridor | null {
  const countries = asRecord(conf)?.countries;
  if (!Array.isArray(countries)) {
    return null;
  }

  const country = query.country.trim().toUpperCase();
  const provider = query.provider.trim().toUpperCase();

  for (const item of countries) {
    const picked = pickFromCountry(item, country, provider);
    if (picked) {
      return picked;
    }
  }

  return null;
}

function pickFromCountry(
  value: unknown,
  country: string,
  provider: string,
): PayoutCorridor | null {
  const row = asRecord(value);
  const code = asNonEmptyString(row?.country)?.toUpperCase();
  const providers = row?.providers;
  if (code !== country || !Array.isArray(providers)) {
    return null;
  }

  for (const item of providers) {
    const picked = pickFromProvider(item, country, provider);
    if (picked) {
      return picked;
    }
  }

  return null;
}

function pickFromProvider(
  value: unknown,
  country: string,
  provider: string,
): PayoutCorridor | null {
  const row = asRecord(value);
  const code = asNonEmptyString(row?.provider)?.toUpperCase();
  const currencies = row?.currencies;
  if (code !== provider || !Array.isArray(currencies)) {
    return null;
  }

  for (const item of currencies) {
    const picked = pickFromCurrency(item, country, provider);
    if (picked) {
      return picked;
    }
  }

  return null;
}

function pickFromCurrency(
  value: unknown,
  country: string,
  provider: string,
): PayoutCorridor | null {
  const row = asRecord(value);
  const currency = asNonEmptyString(row?.currency)?.toUpperCase();
  const payout = readPayoutOperation(row?.operationTypes);
  if (!currency || !payout) {
    return null;
  }

  const decimals = asAmountDecimals(payout.decimalsInAmount);
  const minAmount =
    asNonEmptyString(payout.minAmount) ??
    asNonEmptyString(payout.minTransactionLimit);
  const maxAmount =
    asNonEmptyString(payout.maxAmount) ??
    asNonEmptyString(payout.maxTransactionLimit);
  if (!decimals || !minAmount || !maxAmount) {
    return null;
  }

  return {
    country,
    provider,
    currency,
    decimalsInAmount: decimals,
    minAmount,
    maxAmount,
  };
}

function readPayoutOperation(
  operationTypes: unknown,
): Record<string, unknown> | null {
  const asObject = asRecord(operationTypes);
  if (asObject) {
    return asRecord(asObject.PAYOUT);
  }
  if (!Array.isArray(operationTypes)) {
    return null;
  }

  for (const item of operationTypes) {
    const row = asRecord(item);
    if (!row) {
      continue;
    }
    if (asNonEmptyString(row.operationType)?.toUpperCase() === "PAYOUT") {
      return row;
    }
    const nested = asRecord(row.PAYOUT);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}
