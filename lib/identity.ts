const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const MSISDN_DIGITS = /^[1-9][0-9]{9,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

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

export function stripPhoneDigits(value: string): string {
  return value.trim().replace(/[^\d]/g, "");
}

export function composeMsisdnDigits(
  raw: string,
  selectedPrefix: string,
  knownPrefixes: readonly string[] = [],
): string {
  const digits = stripPhoneDigits(raw);
  const selected = stripPhoneDigits(selectedPrefix);
  const prefixes = uniquePrefixes([
    ...knownPrefixes.map(stripPhoneDigits),
    selected,
  ]).sort((a, b) => b.length - a.length);

  for (const prefix of prefixes) {
    if (prefix && digits.startsWith(prefix)) {
      return digits;
    }
  }

  const local = digits.replace(/^0+/, "");
  return selected ? `${selected}${local}` : local;
}

export function matchLongestDialPrefix(
  raw: string,
  knownPrefixes: readonly string[],
): string | null {
  const digits = stripPhoneDigits(raw);
  const prefixes = uniquePrefixes(knownPrefixes.map(stripPhoneDigits)).sort(
    (a, b) => b.length - a.length,
  );

  for (const prefix of prefixes) {
    if (prefix && digits.startsWith(prefix) && digits.length > prefix.length) {
      return prefix;
    }
  }

  return null;
}

export function nationalNumberDigits(raw: string, dialPrefix: string): string {
  const digits = stripPhoneDigits(raw);
  const prefix = stripPhoneDigits(dialPrefix);
  if (prefix && digits.startsWith(prefix)) {
    return digits.slice(prefix.length);
  }
  return digits;
}

export function formatMsisdnDisplay(
  msisdnDigits: string,
  dialPrefix?: string,
): string {
  const digits = stripPhoneDigits(msisdnDigits);
  if (!digits) {
    return "";
  }

  const prefix = dialPrefix ? stripPhoneDigits(dialPrefix) : "";
  if (prefix && digits.startsWith(prefix) && digits.length > prefix.length) {
    const rest = digits.slice(prefix.length);
    const grouped = rest.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
    return `+${prefix} ${grouped}`.trim();
  }

  return `+${digits}`;
}

export function normalizeMsisdn(
  value: unknown,
): { ok: true; msisdn: string } | { ok: false; reason: string } {
  if (typeof value !== "string") {
    return { ok: false, reason: "msisdn is required" };
  }

  const digits = stripPhoneDigits(value);
  if (!MSISDN_DIGITS.test(digits)) {
    return {
      ok: false,
      reason: "msisdn must be a valid mobile number (10-15 digits)",
    };
  }

  return { ok: true, msisdn: digits };
}

function uniquePrefixes(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    out.push(value);
  }
  return out;
}

/** Optional email for notifications. Empty/undefined → null (skip notify). */
export function normalizeOptionalEmail(
  value: unknown,
): { ok: true; email: string | null } | { ok: false; reason: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, email: null };
  }

  if (typeof value !== "string") {
    return { ok: false, reason: "please provide a valid email address" };
  }

  const email = value.trim().toLowerCase();
  if (!email) {
    return { ok: true, email: null };
  }

  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return { ok: false, reason: "please provide a valid email address" };
  }

  return { ok: true, email };
}
