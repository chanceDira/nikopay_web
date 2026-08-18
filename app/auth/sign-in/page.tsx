"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { WalletKind } from "@/lib/wallet/browser";
import { connectInjectedWallet } from "@/lib/wallet/offramp";
import { persistConnectedWallet } from "@/lib/wallet-session";

type ConnectionState = "idle" | "connecting" | "signing" | "success" | "error";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [walletState, setWalletState] = useState<ConnectionState>("idle");
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [walletError, setWalletError] = useState("");

  // Handle Email Magic Link Flow
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    if (!email) {
      setEmailError("Please enter your email address.");
      return;
    }

    if (!email.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setEmailLoading(true);

    // Simulate sending magic link
    setTimeout(() => {
      setEmailLoading(false);
      setMagicLinkSent(true);
    }, 1500);
  };

  // Handle Web3 Wallet Connect Flow
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
    localStorage.setItem("nikopay_auth_method", "wallet");
    localStorage.setItem("nikopay_email_verified", "false");
    setWalletState("success");
    router.push("/app/pay");
  };

  return (
    <main className="flex min-h-screen flex-col justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background glow */}
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
        <h2 className="text-center text-3xl tracking-tight text-foreground">
          Sign in to NikoPay
        </h2>
        <p className="mt-2 text-center text-sm text-niko-muted">
          Access your secure, instant crypto-to-fiat portal.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-niko-surface/60 border border-niko-border py-8 px-6 shadow-2xl rounded-md sm:px-10 backdrop-blur-sm">
          {/* ================= WALLET CONNECT SECTION ================= */}
          <div className="space-y-4">
            <h3 className="text-sm text-foreground">
              Connect Web3 Wallet (USDT)
            </h3>

            {walletError && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {walletError}
              </div>
            )}

            {walletState === "idle" && (
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => void handleWalletConnect("MetaMask")}
                  className="flex w-full items-center justify-between rounded-md border border-niko-border bg-background px-4 py-3 text-sm font-sans text-foreground hover:border-niko-teal/40 hover:bg-niko-surface transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <Image
                      src="/logos/metamask-logo.png"
                      alt="MetaMask"
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                    />
                    MetaMask
                  </span>
                  <span className="text-xs text-niko-teal">Popular</span>
                </button>

                <button
                  onClick={() => void handleWalletConnect("Coinbase Wallet")}
                  className="flex w-full items-center justify-between rounded-md border border-niko-border bg-background px-4 py-3 text-sm font-sans text-foreground hover:border-niko-teal/40 hover:bg-niko-surface transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <Image
                      src="/logos/coinbase-logo.webp"
                      alt="Coinbase"
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain rounded-md"
                    />
                    Coinbase Wallet
                  </span>
                </button>

                <button
                  onClick={() => void handleWalletConnect("WalletConnect")}
                  className="flex w-full items-center justify-between rounded-md border border-niko-border bg-background px-4 py-3 text-sm font-sans text-foreground hover:border-niko-teal/40 hover:bg-niko-surface transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <Image
                      src="/logos/walletconnect-logo.png"
                      alt="WalletConnect"
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                    />
                    WalletConnect
                  </span>
                </button>
              </div>
            )}

            {walletState !== "idle" && (
              <div className="flex flex-col items-center justify-center py-6 px-4 bg-background/50 rounded-md border border-niko-border/60">
                {walletState === "connecting" && (
                  <>
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-niko-teal border-t-transparent mb-3" />
                    <p className="text-sm text-foreground">
                      Connecting to {selectedWallet}...
                    </p>
                    <p className="text-xs text-niko-muted mt-1">
                      Please confirm the connection request in your wallet
                    extension. Base Sepolia will be selected!
                    </p>
                  </>
                )}

                {walletState === "signing" && (
                  <>
                    <div className="h-8 w-8 animate-pulse rounded-full bg-niko-teal/20 border border-niko-teal flex items-center justify-center mb-3">
                      <svg
                        className="h-4 w-4 text-niko-teal animate-bounce"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-foreground">
                      Awaiting Signature...
                    </p>
                    <p className="text-xs text-niko-muted mt-1 text-center max-w-[240px]">
                      Sign the verification message to prove ownership of your
                      address.
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
                    <p className="text-sm text-foreground">
                      Connected Successfully!
                    </p>
                    <p className="text-xs text-niko-muted mt-1">
                      Redirecting to pay portal...
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ================= SEPARATOR ================= */}
          <div className="relative my-6">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div className="w-full border-t border-niko-border/60"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#131b2e] px-3 text-niko-muted font-medium">
                Or
              </span>
            </div>
          </div>

          {/* ================= EMAIL MAGIC LINK SECTION ================= */}
          <div className="space-y-4">
            <h3 className="text-sm text-foreground">
              Sign In via Email Magic Link
            </h3>

            {emailError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {emailError}
              </div>
            )}

            {magicLinkSent ? (
              <div className="p-4 rounded-md bg-niko-teal/10 border border-niko-teal/30 text-center space-y-2">
                <div className="mx-auto h-8 w-8 rounded-full bg-niko-teal/20 flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-niko-teal"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 19v-8.93a2 2 0 01.89-1.664l8-4.666a2 2 0 012.22 0l8 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.25 0l-2.25 1.5"
                    />
                  </svg>
                </div>
                <h4 className="text-sm text-foreground">Magic Link Sent!</h4>
                <p className="text-xs text-niko-muted leading-relaxed">
                  We sent a login link to{" "}
                  <span className="text-foreground">{email}</span>. Check your
                  inbox to sign in.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("nikopay_auth_method", "email");
                    localStorage.setItem("nikopay_email_verified", "true");
                    localStorage.setItem("nikopay_wallet_connected", "false");
                    localStorage.setItem("nikopay_email_address", email);
                    router.push("/app/pay");
                  }}
                  className="mt-4 flex w-full justify-center items-center rounded-md bg-niko-teal px-4 py-2.5 text-xs text-niko-navy hover:bg-niko-teal-bright transition-all cursor-pointer"
                >
                  Simulate Link Click (Go to App)
                </button>
                <button
                  onClick={() => setMagicLinkSent(false)}
                  className="mt-2 block w-full text-center text-xs text-niko-teal hover:underline"
                >
                  Resend link / Use another email
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    className="block w-full rounded-md border border-niko-border bg-background px-4 py-3 text-foreground shadow-sm focus:border-niko-teal/50 focus:ring-1 focus:ring-niko-teal/50 sm:text-sm outline-none transition-colors font-sans"
                    placeholder="name@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={emailLoading}
                  className="flex w-full justify-center items-center rounded-md bg-niko-teal px-4 py-3.5 text-sm font-bold text-niko-navy hover:bg-niko-teal-bright transition-all disabled:opacity-50 cursor-pointer"
                >
                  {emailLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-niko-navy border-t-transparent" />
                  ) : (
                    "Send Magic Link"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
