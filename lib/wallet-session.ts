import { isStoredTrue, readLocal } from "@/lib/read-local";

export const WALLET_ADDRESS_KEY = "nikopay_wallet_address";
export const WALLET_CONNECTED_KEY = "nikopay_wallet_connected";
export const WALLET_NAME_KEY = "nikopay_wallet_name";

export const SIMULATED_WALLET_ADDRESS =
  "0x71c7656ec7ab88b098defb751b7401b5f6d8976f";

export function persistSimulatedWallet(walletName: string): string {
  localStorage.setItem(WALLET_CONNECTED_KEY, "true");
  localStorage.setItem(WALLET_NAME_KEY, walletName);
  localStorage.setItem(WALLET_ADDRESS_KEY, SIMULATED_WALLET_ADDRESS);
  return SIMULATED_WALLET_ADDRESS;
}

export function readStoredWalletAddress(): string {
  const stored = readLocal(WALLET_ADDRESS_KEY, "");
  if (stored) {
    return stored;
  }

  if (isStoredTrue(WALLET_CONNECTED_KEY)) {
    return SIMULATED_WALLET_ADDRESS;
  }

  return "";
}

export function shortAddress(address: string): string {
  if (address.length < 12) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
