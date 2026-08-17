const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const MSISDN_DIGITS = /^[0-9]{10,15}$/;
const RWANDA_MSISDN = /^250[7-9][0-9]{8}$/;

export function normalizeHexAddress(
  value: unknown,
  field: string,
): { ok: true; address: string } | { ok: false; reason: string } {
  if (typeof value !== "string") {
    return { ok: false, reason: `${field} is required` };
  }

  const address = value.trim();
  if (!ADDRESS_REGEX.test(address)) {
    return {
      ok: false,
      reason: `${field} must be a 0x-prefixed 20-byte hex`,
    };
  }

  return { ok: true, address: address.toLowerCase() };
}

export function normalizeWalletAddress(
  value: unknown,
): { ok: true; address: string } | { ok: false; reason: string } {
  return normalizeHexAddress(value, "wallet address");
}

export function normalizeTxHash(
  value: unknown,
): { ok: true; txHash: string } | { ok: false; reason: string } {
  if (typeof value !== "string") {
    return { ok: false, reason: "tx hash is required" };
  }

  const txHash = value.trim();
  if (!TX_HASH_REGEX.test(txHash)) {
    return { ok: false, reason: "tx hash must be a 0x-prefixed 32-byte hex" };
  }

  return { ok: true, txHash: txHash.toLowerCase() };
}

export function normalizeMsisdn(
  value: unknown,
): { ok: true; msisdn: string } | { ok: false; reason: string } {
  if (typeof value !== "string") {
    return { ok: false, reason: "msisdn is required" };
  }

  const stripped = value.trim().replace(/[+\s-]/g, "");
  const local = /^0[7-9][0-9]{8}$/.test(stripped)
    ? `250${stripped.slice(1)}`
    : stripped;

  if (!MSISDN_DIGITS.test(local) || !RWANDA_MSISDN.test(local)) {
    return { ok: false, reason: "msisdn must be a Rwanda mobile number" };
  }

  return { ok: true, msisdn: local };
}
