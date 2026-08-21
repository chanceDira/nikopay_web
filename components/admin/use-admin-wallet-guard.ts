"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminLoginPath,
  revokeAdminSession,
  type AdminAccessReason,
} from "@/lib/admin-access";
import {
  clearAdminWalletKind,
  readAdminWalletKind,
} from "@/lib/admin-wallet-kind";
import {
  getAccounts,
  listInjectedProviders,
  type EthereumProvider,
} from "@/lib/wallet/browser";
import { restoreWalletConnect } from "@/lib/wallet/walletconnect";

type SessionPayload = {
  data?: { address?: string };
  error?: string;
};

/**
 * Keeps the admin cookie session aligned with the injected wallet.
 * On account switch or disconnect, clears the session and redirects.
 */
export function useAdminWalletGuard(enabled: boolean): {
  sessionAddress: string | null;
  ready: boolean;
  authed: boolean;
} {
  const router = useRouter();
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [ready, setReady] = useState(!enabled);
  const [authed, setAuthed] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const lockingOut = useRef(false);

  const lockOut = useCallback(
    async (reason: AdminAccessReason) => {
      if (lockingOut.current) {
        return;
      }
      lockingOut.current = true;
      sessionRef.current = null;
      setSessionAddress(null);
      setAuthed(false);
      setReady(true);
      clearAdminWalletKind();
      await revokeAdminSession();
      router.replace(adminLoginPath(reason));
    },
    [router],
  );

  const verifyWalletMatchesSession = useCallback(
    async (expected: string) => {
      const kind = readAdminWalletKind();
      if (kind === "WalletConnect") {
        const restored = await restoreWalletConnect();
        if (!restored.ok) {
          return;
        }
        const accounts = await getAccounts(restored.provider);
        if (!accounts.ok || !accounts.address) {
          return;
        }
        if (accounts.address !== expected) {
          await lockOut("wallet_changed");
        }
        return;
      }

      const providers = listInjectedProviders();
      if (providers.length === 0) {
        return;
      }

      for (const provider of providers) {
        const accounts = await getAccounts(provider);
        if (!accounts.ok || !accounts.address) {
          continue;
        }
        if (accounts.address !== expected) {
          await lockOut("wallet_changed");
          return;
        }
      }
    },
    [lockOut],
  );

  useEffect(() => {
    if (!enabled) {
      sessionRef.current = null;
      lockingOut.current = false;
      return;
    }

    let cancelled = false;
    lockingOut.current = false;
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      setReady(false);
      setAuthed(false);
    });

    void (async () => {
      const res = await fetch("/api/admin/session", {
        credentials: "same-origin",
      });
      if (cancelled) {
        return;
      }

      if (!res.ok) {
        setAuthed(false);
        setReady(true);
        router.replace(adminLoginPath("access_denied"));
        return;
      }

      const json = (await res.json()) as SessionPayload;
      const address =
        typeof json.data?.address === "string"
          ? json.data.address.toLowerCase()
          : null;
      if (!address) {
        setAuthed(false);
        setReady(true);
        router.replace(adminLoginPath("access_denied"));
        return;
      }

      sessionRef.current = address;
      setSessionAddress(address);
      setAuthed(true);
      setReady(true);
      await verifyWalletMatchesSession(address);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, router, verifyWalletMatchesSession]);

  useEffect(() => {
    if (!enabled || !authed || !sessionAddress) {
      return;
    }

    const kind = readAdminWalletKind();
    const cleanups: Array<() => void> = [];

    const attach = (provider: EthereumProvider) => {
      if (!provider.on || !provider.removeListener) {
        return;
      }

      const onAccountsChanged = (...args: unknown[]) => {
        const accounts = args[0];
        const expected = sessionRef.current;
        if (!expected) {
          return;
        }
        if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
          void lockOut("wallet_changed");
          return;
        }
        if (String(accounts[0]).toLowerCase() !== expected) {
          void lockOut("wallet_changed");
        }
      };

      const onDisconnect = () => {
        void lockOut("wallet_changed");
      };

      provider.on("accountsChanged", onAccountsChanged);
      provider.on("disconnect", onDisconnect);
      cleanups.push(() => {
        provider.removeListener?.("accountsChanged", onAccountsChanged);
        provider.removeListener?.("disconnect", onDisconnect);
      });
    };

    if (kind === "WalletConnect") {
      let cancelled = false;
      void restoreWalletConnect().then((restored) => {
        if (cancelled || !restored.ok) {
          return;
        }
        attach(restored.provider);
      });
      cleanups.push(() => {
        cancelled = true;
      });
    } else {
      for (const provider of listInjectedProviders()) {
        attach(provider);
      }
    }

    const onFocus = () => {
      const expected = sessionRef.current;
      if (expected) {
        void verifyWalletMatchesSession(expected);
      }
    };

    const poll = window.setInterval(() => {
      const expected = sessionRef.current;
      if (expected) {
        void verifyWalletMatchesSession(expected);
      }
    }, 8_000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [enabled, authed, sessionAddress, lockOut, verifyWalletMatchesSession]);

  return {
    sessionAddress: enabled ? sessionAddress : null,
    ready: enabled ? ready : true,
    authed: enabled ? authed : false,
  };
}
