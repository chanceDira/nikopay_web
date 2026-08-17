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

export function payeeMsisdnForPayout(input: {
  intentMsisdn: string;
  targetEnvironment: string;
  sandboxPayeeMsisdn: string | null;
}): string {
  if (input.targetEnvironment === "sandbox" && input.sandboxPayeeMsisdn) {
    return input.sandboxPayeeMsisdn;
  }

  return input.intentMsisdn;
}
