import { normalizeHexAddress } from "@/lib/identity";

const TRANSFER_SELECTOR = "a9059cbb";

export function usdtToTokenUnits(
  amount: number,
  decimals: number,
): bigint | null {
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 18
  ) {
    return null;
  }

  const [whole, frac = ""] = amount.toFixed(decimals).split(".");
  if (!/^\d+$/.test(whole) || (frac.length > 0 && !/^\d+$/.test(frac))) {
    return null;
  }

  return BigInt(whole + frac.padEnd(decimals, "0"));
}

export function encodeErc20Transfer(
  to: string,
  amount: bigint,
): { ok: true; data: `0x${string}` } | { ok: false; reason: string } {
  if (amount < BigInt(0)) {
    return { ok: false, reason: "transfer amount is invalid" };
  }

  const address = normalizeHexAddress(to, "treasury address");
  if (!address.ok) {
    return address;
  }

  const paddedTo = address.address.slice(2).padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");
  return {
    ok: true,
    data: `0x${TRANSFER_SELECTOR}${paddedTo}${paddedAmount}`,
  };
}
