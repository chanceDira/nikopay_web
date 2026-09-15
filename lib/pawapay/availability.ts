import type {
  AvailabilityCountry,
  AvailabilityOperationStatus,
} from "@/lib/pawapay/types";

export type PayoutAvailabilityRow = {
  country: string;
  provider: string;
  status: AvailabilityOperationStatus;
};

export function flattenPayoutAvailability(
  countries: AvailabilityCountry[],
): PayoutAvailabilityRow[] {
  return flattenOperationAvailability(countries, "PAYOUT");
}

export function flattenDepositAvailability(
  countries: AvailabilityCountry[],
): PayoutAvailabilityRow[] {
  return flattenOperationAvailability(countries, "DEPOSIT");
}

export function flattenRemittanceAvailability(
  countries: AvailabilityCountry[],
): PayoutAvailabilityRow[] {
  const remittance = flattenOperationAvailability(countries, "REMITTANCE");
  return remittance.length > 0
    ? remittance
    : flattenPayoutAvailability(countries);
}

function flattenOperationAvailability(
  countries: AvailabilityCountry[],
  operation: "PAYOUT" | "DEPOSIT" | "REMITTANCE",
): PayoutAvailabilityRow[] {
  const rows: PayoutAvailabilityRow[] = [];
  for (const country of countries) {
    for (const provider of country.providers) {
      for (const op of provider.operationTypes) {
        if (op.operationType.toUpperCase() !== operation) {
          continue;
        }
        rows.push({
          country: country.country,
          provider: provider.provider,
          status: op.status,
        });
      }
    }
  }
  return rows.sort((a, b) =>
    `${a.country}${a.provider}`.localeCompare(`${b.country}${b.provider}`),
  );
}

export function payoutAvailabilityStatus(
  rows: PayoutAvailabilityRow[],
  country: string,
  provider: string,
): AvailabilityOperationStatus | null {
  const match = rows.find(
    (row) => row.country === country && row.provider === provider,
  );
  return match?.status ?? null;
}
