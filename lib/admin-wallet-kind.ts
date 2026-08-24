import type { WalletKind } from "@/lib/wallet/browser";

const STORAGE_KEY = "nikopay_admin_wallet_kind";

export function persistAdminWalletKind(kind: WalletKind): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, kind);
}

export function readAdminWalletKind(): WalletKind | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = sessionStorage.getItem(STORAGE_KEY);
  if (
    value === "MetaMask" ||
    value === "Coinbase Wallet" ||
    value === "WalletConnect"
  ) {
    return value;
  }
  return null;
}

export function clearAdminWalletKind(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(STORAGE_KEY);
}
