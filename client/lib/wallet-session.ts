import { readLocal } from "@/lib/read-local";

const WALLET_ADDRESS_KEY = "nikopay_wallet_address";
const WALLET_CONNECTED_KEY = "nikopay_wallet_connected";
const WALLET_NAME_KEY = "nikopay_wallet_name";

export function persistConnectedWallet(
  address: string,
  walletName: string,
): string {
  const normalized = address.toLowerCase();
  localStorage.setItem(WALLET_CONNECTED_KEY, "true");
  localStorage.setItem(WALLET_NAME_KEY, walletName);
  localStorage.setItem(WALLET_ADDRESS_KEY, normalized);
  return normalized;
}

export function clearConnectedWallet(): void {
  localStorage.removeItem(WALLET_CONNECTED_KEY);
  localStorage.removeItem(WALLET_NAME_KEY);
  localStorage.removeItem(WALLET_ADDRESS_KEY);
}

export function readStoredWalletName(): string {
  return readLocal(WALLET_NAME_KEY, "MetaMask");
}

export function sameWalletAddress(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) {
    return false;
  }
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function shortAddress(address: string): string {
  if (address.length < 12) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
