"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { WalletPicker } from "@/components/shared/wallet-picker";
import type { WalletKind } from "@/lib/wallet/browser";
import { connectInjectedWallet } from "@/lib/wallet/offramp";
import { persistConnectedWallet } from "@/lib/wallet-session";

type ConnectionState = "idle" | "connecting" | "success" | "error";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const switched = searchParams.get("switched") === "1";
  const [walletState, setWalletState] = useState<ConnectionState>("idle");
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [walletError, setWalletError] = useState("");

  const handleWalletConnect = async (walletName: WalletKind) => {
    setSelectedWallet(walletName);
    setWalletError("");
    setWalletState("connecting");

    const result = await connectInjectedWallet(walletName, "base");
    if (!result.ok) {
      setWalletState("idle");
      setWalletError(result.reason);
      return;
    }

    persistConnectedWallet(result.address, result.walletName);
    setWalletState("success");
    router.replace("/app/pay");
  };

  const busy = walletState === "connecting" || walletState === "success";

  return (
    <main className="flex min-h-screen flex-col justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        aria-hidden
      >
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-niko-teal/20 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-niko-blue/15 blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <BrandLogo
              width={160}
              height={45}
              className="h-10"
              priority
            />
          </Link>
        </div>
        <h2 className="text-center text-3xl tracking-tight text-foreground">
          Sign in to NikoPay
        </h2>
        <p className="mt-2 text-center text-sm text-niko-muted">
          Connect a wallet to send USDT and pay out RWF on MoMo.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-niko-surface/60 border border-niko-border py-8 px-6 shadow-2xl rounded-md sm:px-10 backdrop-blur-sm">
          <div className="space-y-4">
            <h3 className="text-sm text-foreground">Connect wallet</h3>

            {switched && walletState === "idle" && !walletError && (
              <div className="p-3 rounded-md bg-niko-teal/10 border border-niko-teal/20 text-xs text-niko-teal">
                Previous wallet cleared. Connect the wallet you want to use
                next.
              </div>
            )}

            {walletError && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {walletError}
              </div>
            )}

            {walletState === "idle" && (
              <WalletPicker
                disabled={busy}
                onSelect={(kind) => void handleWalletConnect(kind)}
              />
            )}

            {walletState !== "idle" && (
              <div className="flex flex-col items-center justify-center py-6 px-4 bg-background/50 rounded-md border border-niko-border/60">
                {walletState === "connecting" && (
                  <>
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-niko-teal border-t-transparent mb-3" />
                    <p className="text-sm text-foreground">
                      Connecting to {selectedWallet}...
                    </p>
                    <p className="text-xs text-niko-muted mt-1 text-center">
                      Confirm in your wallet or scan the WalletConnect QR code.
                      Base Sepolia will be selected.
                    </p>
                  </>
                )}

                {walletState === "success" && (
                  <>
                    <div className="h-8 w-8 rounded-full bg-niko-teal/20 flex items-center justify-center mb-3 border border-niko-teal">
                      <svg
                        className="h-5 w-5 text-niko-teal"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-foreground">Connected</p>
                    <p className="text-xs text-niko-muted mt-1">
                      Redirecting to pay portal...
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
