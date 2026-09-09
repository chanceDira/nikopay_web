import { loadActiveTreasuryAddresses } from "@/lib/treasury";

const ADMIN_WALLET_ALLOWLIST_ENV = "ADMIN_WALLET_ALLOWLIST";
const ADMIN_INCLUDE_TREASURY_ENV = "ADMIN_INCLUDE_TREASURY";

function parseHexAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return null;
  }
  return trimmed.toLowerCase();
}

function parseAllowlistEnv(env: Record<string, string | undefined>): string[] {
  const raw = env[ADMIN_WALLET_ALLOWLIST_ENV]?.trim();
  if (!raw) {
    return [];
  }

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const parsed = parseHexAddress(part);
    if (!parsed) continue;
    if (seen.has(parsed)) continue;
    seen.add(parsed);
    out.push(parsed);
  }

  return out;
}

function includeTreasuryFromEnv(
  env: Record<string, string | undefined>,
): boolean {
  const raw = env[ADMIN_INCLUDE_TREASURY_ENV]?.trim().toLowerCase();
  if (!raw) return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return true;
}

export async function loadAdminWalletAddresses(
  env: Record<string, string | undefined> = process.env,
): Promise<{ ok: true; addresses: string[] } | { ok: false; reason: string }> {
  const allowlist = parseAllowlistEnv(env);
  const includeTreasury = includeTreasuryFromEnv(env);

  let treasuryAddresses: string[] = [];
  if (includeTreasury) {
    const treasury = await loadActiveTreasuryAddresses();
    if (!treasury.ok) {
      return { ok: false, reason: treasury.reason };
    }
    treasuryAddresses = treasury.addresses.map((a) => a.toLowerCase());
  }

  const addresses = new Set<string>([...treasuryAddresses, ...allowlist]);

  if (addresses.size === 0) {
    return { ok: false, reason: "admin wallets not configured" };
  }

  return { ok: true, addresses: [...addresses] };
}
