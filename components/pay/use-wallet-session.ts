"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearConnectedWallet,
  persistConnectedWallet,
  readStoredWalletAddress,
  readStoredWalletName,
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

    applyConnected(accounts.address, kind);
    setHydrated(true);
    return accounts.address;
  }, [applyConnected, applyDisconnected]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      void syncFromProvider();
    });
    return () => {
      cancelled = true;
    };
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
        return;
      }
      applyConnected(String(accounts[0]).toLowerCase(), kind);
    };

    const onDisconnect = () => {
      applyDisconnected();
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
  }, [applyDisconnected]);

  return {
    walletConnected,
    walletAddress,
    walletName,
    hydrated,
    connect,
    disconnect,
    syncFromProvider,
  };
}
