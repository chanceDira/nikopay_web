"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { WalletPicker } from "@/components/shared/wallet-picker";
import {
  adminAccessMessage,
  isAdminAccessReason,
} from "@/lib/admin-access";
import { persistAdminWalletKind } from "@/lib/admin-wallet-kind";
import type { WalletKind } from "@/lib/wallet/browser";
import { proveTreasuryAdmin } from "@/lib/wallet/admin";

type ConnectionState = "idle" | "connecting" | "success";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessError = searchParams.get("error");
  const [walletState, setWalletState] = useState<ConnectionState>("idle");
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [error, setError] = useState(() =>
    isAdminAccessReason(accessError)
      ? adminAccessMessage(accessError)
      : "",
  );

  const handleConnect = async (walletName: WalletKind) => {
    setSelectedWallet(walletName);
    setError("");
    setWalletState("connecting");

    const result = await proveTreasuryAdmin(walletName);
    if (!result.ok) {
      setWalletState("idle");
      setError(result.reason);
      return;
    }

    persistAdminWalletKind(walletName);
    setWalletState("success");
    router.replace("/admin");
  };

  return (
    <main className="flex min-h-screen flex-col justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        aria-hidden
      >
        <div className="absolute left-1/3 top-1/3 h-96 w-96 rounded-full bg-niko-blue/20 blur-3xl" />
        <div className="absolute right-1/3 bottom-1/3 h-96 w-96 rounded-full bg-niko-teal/15 blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Image
              src="/nikopay-logo.png"
              alt="NikoPay Logo"
              width={160}
              height={45}
              className="h-10 w-auto"
              priority
            />
          </Link>
        </div>

        <div className="mb-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-niko-teal/20 bg-niko-teal/5 px-3 py-1 text-center text-xs font-semibold text-niko-teal max-w-max mx-auto">
          Restricted administration
        </div>

        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground mt-2">
          Ops console
        </h2>
        <p className="mt-2 text-center text-sm text-niko-muted">
          Connect an active treasury wallet.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-niko-surface/60 border border-niko-border py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-sm">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          {walletState === "idle" && (
            <WalletPicker onSelect={(kind) => void handleConnect(kind)} />
          )}

          {walletState !== "idle" && (
            <div className="flex flex-col items-center justify-center py-6 px-4 bg-background/50 rounded-md border border-niko-border/60">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-niko-teal border-t-transparent mb-3" />
              <p className="text-sm text-foreground">
                {walletState === "success"
                  ? "Opening ops..."
                  : `Confirm in ${selectedWallet}`}
              </p>
              <p className="text-xs text-niko-muted mt-1 text-center">
                Approve the connection in your wallet.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
