"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearConnectedWallet,
  persistConnectedWallet,
  readStoredWalletAddress,
  readStoredWalletName,
  sameWalletAddress,
} from "@/lib/wallet-session";
import {
  getAccounts,
  getInjectedProvider,
  type WalletKind,
} from "@/lib/wallet/browser";

function asWalletKind(name: string): WalletKind {
  if (name === "Coinbase Wallet" || name === "WalletConnect") {
    return name;
  }
  return "MetaMask";
}

export function useWalletSession() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletName, setWalletName] = useState("MetaMask");
  const [hydrated, setHydrated] = useState(false);
  const [accountEpoch, setAccountEpoch] = useState(0);

  const applyConnected = useCallback((address: string, name: WalletKind) => {
    const normalized = persistConnectedWallet(address, name);
    setWalletConnected(true);
    setWalletAddress(normalized);
    setWalletName(name);
  }, []);

  const applyDisconnected = useCallback(() => {
    clearConnectedWallet();
    setWalletConnected(false);
    setWalletAddress("");
  }, []);

  const syncFromProvider = useCallback(async (): Promise<string | null> => {
    const kind = asWalletKind(readStoredWalletName());
    if (kind === "WalletConnect") {
      const stored = readStoredWalletAddress();
      if (stored) {
        setWalletConnected(true);
        setWalletAddress(stored);
        setWalletName(kind);
        setHydrated(true);
        return stored;
      }
      applyDisconnected();
      setHydrated(true);
      return null;
    }

    const found = getInjectedProvider(kind);
    if (!found.ok) {
      applyDisconnected();
      setHydrated(true);
      return null;
    }

    const accounts = await getAccounts(found.provider);
    if (!accounts.ok || !accounts.address) {
      applyDisconnected();
      setHydrated(true);
      return null;
    }

    const previous = readStoredWalletAddress();
    applyConnected(accounts.address, kind);
    if (previous && !sameWalletAddress(previous, accounts.address)) {
      setAccountEpoch((value) => value + 1);
    }
    setHydrated(true);
    return accounts.address;
  }, [applyConnected, applyDisconnected]);

  useEffect(() => {
    void syncFromProvider();
  }, [syncFromProvider]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const kind = asWalletKind(walletName);
    if (kind === "WalletConnect") {
      return;
    }

    const found = getInjectedProvider(kind);
    if (!found.ok || !found.provider.on || !found.provider.removeListener) {
      return;
    }

    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0];
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        applyDisconnected();
        setAccountEpoch((value) => value + 1);
        return;
      }

      const next = String(accounts[0]).toLowerCase();
      const previous = walletAddress;
      applyConnected(next, kind);
      if (!sameWalletAddress(previous, next)) {
        setAccountEpoch((value) => value + 1);
      }
    };

    const onDisconnect = () => {
      applyDisconnected();
      setAccountEpoch((value) => value + 1);
    };

    const onChainChanged = () => {
      void syncFromProvider();
    };

    found.provider.on("accountsChanged", onAccountsChanged);
    found.provider.on("disconnect", onDisconnect);
    found.provider.on("chainChanged", onChainChanged);

    return () => {
      found.provider.removeListener?.("accountsChanged", onAccountsChanged);
      found.provider.removeListener?.("disconnect", onDisconnect);
      found.provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, [
    applyConnected,
    applyDisconnected,
    hydrated,
    syncFromProvider,
    walletAddress,
    walletName,
  ]);

  const connect = useCallback(
    (address: string, name: WalletKind) => {
      applyConnected(address, name);
    },
    [applyConnected],
  );

  const disconnect = useCallback(() => {
    applyDisconnected();
    setAccountEpoch((value) => value + 1);
  }, [applyDisconnected]);

  return {
    walletConnected,
    walletAddress,
    walletName,
    hydrated,
    accountEpoch,
    connect,
    disconnect,
    syncFromProvider,
  };
}
