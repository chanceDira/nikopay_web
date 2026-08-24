"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearConnectedWallet,
  persistConnectedWallet,
  readStoredWalletName,
} from "@/lib/wallet-session";
import {
  getAccounts,
  getInjectedProvider,
  asWalletKind,
  type WalletKind,
} from "@/lib/wallet/browser";
import {
  disconnectWalletConnect,
  restoreWalletConnect,
} from "@/lib/wallet/walletconnect";

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
    const kind = asWalletKind(readStoredWalletName());
    clearConnectedWallet();
    setWalletConnected(false);
    setWalletAddress("");
    if (kind === "WalletConnect") {
      void disconnectWalletConnect();
    }
  }, []);

  const syncFromProvider = useCallback(async (): Promise<string | null> => {
    const kind = asWalletKind(readStoredWalletName());

    if (kind === "WalletConnect") {
      const restored = await restoreWalletConnect();
      if (!restored.ok) {
        applyDisconnected();
        setHydrated(true);
        return null;
      }

      const accounts = await getAccounts(restored.provider);
      if (!accounts.ok || !accounts.address) {
        applyDisconnected();
        setHydrated(true);
        return null;
      }

      applyConnected(accounts.address, kind);
      setHydrated(true);
      return accounts.address;
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
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    const attach = async () => {
      const providerResult =
        kind === "WalletConnect"
          ? await restoreWalletConnect()
          : getInjectedProvider(kind);

      if (cancelled || !providerResult.ok) {
        return;
      }

      const provider = providerResult.provider;
      if (!provider.on || !provider.removeListener) {
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

      provider.on("accountsChanged", onAccountsChanged);
      provider.on("disconnect", onDisconnect);
      provider.on("chainChanged", onChainChanged);
      cleanups.push(() => {
        provider.removeListener?.("accountsChanged", onAccountsChanged);
        provider.removeListener?.("disconnect", onDisconnect);
        provider.removeListener?.("chainChanged", onChainChanged);
      });
    };

    void attach();

    return () => {
      cancelled = true;
      for (const cleanup of cleanups) {
        cleanup();
      }
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
