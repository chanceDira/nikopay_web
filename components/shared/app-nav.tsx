"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { clearConnectedWallet } from "@/lib/wallet-session";
import { disconnectWalletConnect } from "@/lib/wallet/walletconnect";
import { clearWalletSession } from "@/lib/wallet/user";

const links = [
  { href: "/app/pay", label: "New payment" },
  { href: "/app/links", label: "Links" },
  { href: "/app/payments", label: "History" },
  { href: "/app/profile", label: "Profile" },
] as const;

const SwitchWalletIcon = () => (
  <svg
    className="h-4.5 w-4.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-9L21 12m0 0L16.5 16.5M21 12H7.5"
    />
  </svg>
);

export function AppNav() {
  const [switching, setSwitching] = useState(false);

  const switchWallet = () => {
    if (switching) {
      return;
    }
    setSwitching(true);
    clearConnectedWallet();
    void clearWalletSession();
    void disconnectWalletConnect().finally(() => {
      window.location.href = "/auth/sign-in?switched=1";
    });
  };

  return (
    <header className="pointer-events-none fixed top-6 right-0 left-0 z-40 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-4xl rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] p-3 shadow-2xl backdrop-blur-xl sm:px-6">
        <nav
          className="flex items-center justify-between"
          aria-label="Main navigation"
        >
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo className="h-8 sm:h-8.5" priority />
          </Link>
          <div className="flex items-center gap-3 text-xs sm:gap-5 sm:text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-niko-muted transition-colors hover:text-niko-teal"
              >
                {link.label}
              </Link>
            ))}

            <button
              type="button"
              onClick={switchWallet}
              disabled={switching}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-niko-border bg-background/50 text-niko-muted outline-none transition-all hover:border-niko-teal/40 hover:bg-niko-surface hover:text-niko-teal disabled:cursor-wait disabled:opacity-50"
              title="Switch wallet"
              aria-label="Switch wallet"
            >
              <SwitchWalletIcon />
            </button>

            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
