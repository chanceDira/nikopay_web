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
  const digits = phoneDigitsForPrefixMatch(raw);
  const selected = stripPhoneDigits(selectedPrefix);
  const prefixes = sortedPrefixes([
    ...knownPrefixes.map(stripPhoneDigits),
    selected,
  ]);

  for (const prefix of prefixes) {
    if (prefix && digits.startsWith(prefix) && digits.length > prefix.length) {
      const national = digits.slice(prefix.length).replace(/^0+/, "");
      return national ? `${prefix}${national}` : digits;
    }
  }

  const local = digits.replace(/^0+/, "");
  return selected ? `${selected}${local}` : local;
}

export function matchLongestDialPrefix(
  raw: string,
  knownPrefixes: readonly string[],
): string | null {
  const digits = phoneDigitsForPrefixMatch(raw);
  const prefixes = sortedPrefixes(knownPrefixes.map(stripPhoneDigits));

  for (const prefix of prefixes) {
    if (prefix && digits.startsWith(prefix) && digits.length > prefix.length) {
      return prefix;
    }
  }

  return null;
}

export function nationalNumberDigits(raw: string, dialPrefix: string): string {
  const digits = phoneDigitsForPrefixMatch(raw);
  const prefix = stripPhoneDigits(dialPrefix);
  if (prefix && digits.startsWith(prefix)) {
    return digits.slice(prefix.length).replace(/^0+/, "");
  }
  const local = digits.replace(/^0+/, "");
  return local || digits;
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
    return { ok: false, reason: "recipient number is required" };
  }

  const digits = phoneDigitsForPrefixMatch(value);
  if (!MSISDN_DIGITS.test(digits)) {
    return {
      ok: false,
      reason: "enter a local number or international number with country code",
    };
  }

  return { ok: true, msisdn: digits };
}

export function normalizeMsisdnForCountry(
  value: unknown,
  countryPrefix: string,
  knownPrefixes: readonly string[] = [],
): { ok: true; msisdn: string } | { ok: false; reason: string } {
  if (typeof value !== "string" || !stripPhoneDigits(value)) {
    return { ok: false, reason: "recipient number is required" };
  }

  const prefix = stripPhoneDigits(countryPrefix);
  if (!prefix) {
    return { ok: false, reason: "country dial code is missing" };
  }

  const prefixes = uniquePrefixes([
    ...knownPrefixes.map(stripPhoneDigits),
    prefix,
  ]);
  const matched = matchLongestDialPrefix(value, prefixes);
  if (matched && matched !== prefix) {
    return {
      ok: false,
      reason: "number does not match the selected country",
    };
  }

  const composed = composeMsisdnDigits(value, prefix, prefixes);
  if (!composed.startsWith(prefix) || !MSISDN_DIGITS.test(composed)) {
    return {
      ok: false,
      reason: `enter a local number or +${prefix}…`,
    };
  }

  return { ok: true, msisdn: composed };
}

function phoneDigitsForPrefixMatch(raw: string): string {
  const digits = stripPhoneDigits(raw);
  if (digits.startsWith("00")) {
    return digits.replace(/^0+/, "");
  }
  return digits;
}

function sortedPrefixes(values: string[]): string[] {
  return uniquePrefixes(values).sort((a, b) => b.length - a.length);
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
