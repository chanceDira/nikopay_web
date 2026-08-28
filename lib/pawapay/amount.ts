export type AmountDecimals = "NONE" | "TWO_PLACES";

export function asAmountDecimals(value: unknown): AmountDecimals | null {
  if (value === "NONE" || value === "TWO_PLACES") {
    return value;
  }
  return null;
}

export function formatPayoutAmount(
  amount: number,
  decimals: AmountDecimals,
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  if (decimals === "NONE") {
    if (!Number.isInteger(amount)) {
      return null;
    }
    return String(amount);
  }

  if (Number.isInteger(amount)) {
    return String(amount);
  }

  return amount.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
