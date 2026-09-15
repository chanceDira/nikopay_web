"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { adminLoginPath, revokeAdminSession } from "@/lib/admin-access";
import { clearAdminWalletKind } from "@/lib/admin-wallet-kind";
import { disconnectWalletConnect } from "@/lib/wallet/walletconnect";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/review", label: "Review" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/bulk", label: "Bulk" },
  { href: "/admin/collections", label: "Collect" },
  { href: "/admin/remittances", label: "Remit" },
  { href: "/admin/pawapay", label: "PawaPay" },
  { href: "/admin/fx", label: "FX" },
  { href: "/admin/treasury", label: "Treasury" },
  { href: "/admin/checkouts", label: "Links" },
  { href: "/docs", label: "API" },
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

export function AdminNav() {
  const endSession = (reason: "session_ended" | "wallet_changed") => {
    clearAdminWalletKind();
    void Promise.all([revokeAdminSession(), disconnectWalletConnect()]).finally(
      () => {
        window.location.href = adminLoginPath(reason);
      },
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-niko-border bg-background/95 backdrop-blur-md">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6"
        aria-label="Admin navigation"
      >
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
            <BrandLogo className="h-8 sm:h-8.5" priority />
          </Link>
          <span className="text-[10px] uppercase tracking-widest font-mono text-niko-teal border border-niko-teal/30 px-1.5 py-0.5 rounded bg-niko-teal/5 font-semibold">
            admin
          </span>
        </div>

        <div className="flex items-center gap-5 text-sm">
          <div className="hidden md:flex items-center gap-3 lg:gap-5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-niko-muted transition-colors hover:text-niko-teal"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="md:hidden flex items-center gap-3">
            <Link
              href="/admin"
              className="text-niko-muted text-xs transition-colors hover:text-niko-teal"
            >
              Ops
            </Link>
            <Link
              href="/admin/transactions"
              className="text-niko-muted text-xs transition-colors hover:text-niko-teal"
            >
              Tx
            </Link>
            <Link
              href="/admin/payouts"
              className="text-niko-muted text-xs transition-colors hover:text-niko-teal"
            >
              Pay
            </Link>
            <Link
              href="/admin/pawapay"
              className="text-niko-muted text-xs transition-colors hover:text-niko-teal"
            >
              PP
            </Link>
            <Link
              href="/admin/review"
              className="text-niko-muted text-xs transition-colors hover:text-niko-teal"
            >
              Rev
            </Link>
          </div>

          <div className="h-4 w-px bg-niko-border/30" />

          <Link
            href="/app/pay"
            className="rounded border border-niko-border bg-niko-surface px-2.5 py-1 text-xs text-niko-muted hover:border-niko-teal/40 hover:text-niko-teal"
          >
            App
          </Link>

          <button
            type="button"
            onClick={() => endSession("wallet_changed")}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-niko-border bg-niko-surface text-niko-muted outline-none hover:border-niko-teal/40 hover:text-niko-teal"
            title="Switch wallet"
            aria-label="Switch wallet"
          >
            <SwitchWalletIcon />
          </button>

          <button
            type="button"
            onClick={() => endSession("session_ended")}
            className="rounded border border-niko-border bg-niko-surface px-2.5 py-1 text-xs font-bold text-niko-muted outline-none hover:border-niko-teal/40 hover:text-niko-teal"
          >
            Logout
          </button>

          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
