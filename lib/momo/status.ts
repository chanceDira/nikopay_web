export type MomoTransferStatus =
  "pending" | "successful" | "failed" | "timeout";

export function mapMomoProviderStatus(
  value: unknown,
): MomoTransferStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  switch (value.toUpperCase()) {
    case "SUCCESSFUL":
      return "successful";
    case "PENDING":
      return "pending";
    case "FAILED":
      return "failed";
    case "TIMEOUT":
      return "timeout";
    default:
      return null;
  }
}

export function formatMomoAmount(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  if (Number.isInteger(amount)) {
    return String(amount);
  }

  return amount.toFixed(2);
}

/** Sandbox only accepts EUR and small test amounts, never RWF net. */
export const SANDBOX_DISBURSEMENT_AMOUNT = "1";

export function transferAmountForMomo(input: {
  netRwf: number;
  targetEnvironment: string;
}): string | null {
  if (input.targetEnvironment === "sandbox") {
    return SANDBOX_DISBURSEMENT_AMOUNT;
  }

  return formatMomoAmount(input.netRwf);
}

export function payeeMsisdnForPayout(input: {
  intentMsisdn: string;
  targetEnvironment: string;
  sandboxPayeeMsisdn: string | null;
}): string | null {
  if (input.targetEnvironment === "sandbox") {
    return input.sandboxPayeeMsisdn;
  }

  return input.intentMsisdn;
}
