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

export type DepositCorridor = PayoutCorridor;

export type CorridorProviderOption = {
  country: string;
  provider: string;
  displayName: string;
  currency: string;
  decimalsInAmount: AmountDecimals;
  minAmount: string;
  maxAmount: string;
};

export type CorridorCountryOption = {
  country: string;
  prefix: string;
  displayName: string;
  currency?: string;
};

type CorridorOperation = "PAYOUT" | "DEPOSIT" | "REMITTANCE";

export function listPayoutCountries(conf: unknown): CorridorCountryOption[] {
  return listOperationCountries(conf, "PAYOUT");
}

export function listDepositCountries(conf: unknown): CorridorCountryOption[] {
  return listOperationCountries(conf, "DEPOSIT");
}

export function listRemittanceCountries(
  conf: unknown,
): CorridorCountryOption[] {
  const remittance = listOperationCountries(conf, "REMITTANCE");
  return remittance.length > 0 ? remittance : listPayoutCountries(conf);
}

function listOperationCountries(
  conf: unknown,
  operation: CorridorOperation,
): CorridorCountryOption[] {
  const countries = asRecord(conf)?.countries;
  if (!Array.isArray(countries)) {
    return [];
  }

  const options: CorridorCountryOption[] = [];
  for (const item of countries) {
    const row = asRecord(item);
    const country = asNonEmptyString(row?.country)?.toUpperCase();
    const prefix = asNonEmptyString(row?.prefix)?.replace(/^\+/, "");
    if (!country || !prefix || !/^\d{1,4}$/.test(prefix)) {
      continue;
    }
    const providers = listOperationProviders(conf, country, operation);
    if (providers.length === 0) {
      continue;
    }
    options.push({
      country,
      prefix,
      displayName: countryDisplayName(row?.displayName) ?? country,
      currency: providers[0]?.currency,
    });
  }

  return options.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function countryDisplayName(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  const row = asRecord(value);
  const en = asNonEmptyString(row?.en);
  if (en) {
    return en;
  }
  const fr = asNonEmptyString(row?.fr);
  return fr;
}

export function listPayoutProviders(
  conf: unknown,
  country: string,
): CorridorProviderOption[] {
  return listOperationProviders(conf, country, "PAYOUT");
}

export function listDepositProviders(
  conf: unknown,
  country: string,
): CorridorProviderOption[] {
  return listOperationProviders(conf, country, "DEPOSIT");
}

export function listRemittanceProviders(
  conf: unknown,
  country: string,
): CorridorProviderOption[] {
  const remittance = listOperationProviders(conf, country, "REMITTANCE");
  return remittance.length > 0
    ? remittance
    : listOperationProviders(conf, country, "PAYOUT");
}

function listOperationProviders(
  conf: unknown,
  country: string,
  operation: CorridorOperation,
): CorridorProviderOption[] {
  const countries = asRecord(conf)?.countries;
  if (!Array.isArray(countries)) {
    return [];
  }

  const code = country.trim().toUpperCase();
  const options: CorridorProviderOption[] = [];

  for (const item of countries) {
    const row = asRecord(item);
    const countryCode = asNonEmptyString(row?.country)?.toUpperCase();
    const providers = row?.providers;
    if (countryCode !== code || !Array.isArray(providers)) {
      continue;
    }

    for (const providerItem of providers) {
      const providerRow = asRecord(providerItem);
      const provider = asNonEmptyString(providerRow?.provider)?.toUpperCase();
      if (!provider) {
        continue;
      }
      const displayName =
        asNonEmptyString(providerRow?.displayName) ??
        asNonEmptyString(providerRow?.nameDisplayedToCustomer) ??
        provider;
      const currencies = providerRow?.currencies;
      if (!Array.isArray(currencies)) {
        continue;
      }
      for (const currencyItem of currencies) {
        const corridor = pickFromCurrency(
          currencyItem,
          countryCode,
          provider,
          operation,
        );
        if (!corridor) {
          continue;
        }
        options.push({
          country: corridor.country,
          provider: corridor.provider,
          displayName,
          currency: corridor.currency,
          decimalsInAmount: corridor.decimalsInAmount,
          minAmount: corridor.minAmount,
          maxAmount: corridor.maxAmount,
        });
      }
    }
  }

  return options;
}

export function listPayoutCurrencies(conf: unknown): string[] {
  const seen = new Set<string>();
  for (const country of listPayoutCountries(conf)) {
    for (const provider of listPayoutProviders(conf, country.country)) {
      seen.add(provider.currency);
    }
  }
  return [...seen].sort();
}

export function pickPayoutCorridor(
  conf: unknown,
  query: { country: string; provider: string },
): PayoutCorridor | null {
  return pickOperationCorridor(conf, query, "PAYOUT");
}

export function pickDepositCorridor(
  conf: unknown,
  query: { country: string; provider: string },
): DepositCorridor | null {
  return pickOperationCorridor(conf, query, "DEPOSIT");
}

export function pickRemittanceCorridor(
  conf: unknown,
  query: { country: string; provider: string },
): PayoutCorridor | null {
  return (
    pickOperationCorridor(conf, query, "REMITTANCE") ??
    pickOperationCorridor(conf, query, "PAYOUT")
  );
}

function pickOperationCorridor(
  conf: unknown,
  query: { country: string; provider: string },
  operation: CorridorOperation,
): PayoutCorridor | null {
  const countries = asRecord(conf)?.countries;
  if (!Array.isArray(countries)) {
    return null;
  }

  const country = query.country.trim().toUpperCase();
  const provider = query.provider.trim().toUpperCase();

  for (const item of countries) {
    const picked = pickFromCountry(item, country, provider, operation);
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
  operation: CorridorOperation,
): PayoutCorridor | null {
  const row = asRecord(value);
  const code = asNonEmptyString(row?.country)?.toUpperCase();
  const providers = row?.providers;
  if (code !== country || !Array.isArray(providers)) {
    return null;
  }

  for (const item of providers) {
    const picked = pickFromProvider(item, country, provider, operation);
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
  operation: CorridorOperation,
): PayoutCorridor | null {
  const row = asRecord(value);
  const code = asNonEmptyString(row?.provider)?.toUpperCase();
  const currencies = row?.currencies;
  if (code !== provider || !Array.isArray(currencies)) {
    return null;
  }

  for (const item of currencies) {
    const picked = pickFromCurrency(item, country, provider, operation);
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
  operation: CorridorOperation,
): PayoutCorridor | null {
  const row = asRecord(value);
  const currency = asNonEmptyString(row?.currency)?.toUpperCase();
  const op = readOperation(row?.operationTypes, operation);
  if (!currency || !op) {
    return null;
  }

  const decimals = asAmountDecimals(op.decimalsInAmount);
  const minAmount =
    asNonEmptyString(op.minAmount) ?? asNonEmptyString(op.minTransactionLimit);
  const maxAmount =
    asNonEmptyString(op.maxAmount) ?? asNonEmptyString(op.maxTransactionLimit);
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

function readOperation(
  operationTypes: unknown,
  operation: CorridorOperation,
): Record<string, unknown> | null {
  const asObject = asRecord(operationTypes);
  if (asObject) {
    return asRecord(asObject[operation]);
  }
  if (!Array.isArray(operationTypes)) {
    return null;
  }

  for (const item of operationTypes) {
    const row = asRecord(item);
    if (!row) {
      continue;
    }
    if (asNonEmptyString(row.operationType)?.toUpperCase() === operation) {
      return row;
    }
    const nested = asRecord(row[operation]);
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
