"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { adminLoginPath, revokeAdminSession } from "@/lib/admin-access";
import { clearAdminWalletKind } from "@/lib/admin-wallet-kind";
import { disconnectWalletConnect } from "@/lib/wallet/walletconnect";

type NavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "monitor",
    label: "Monitor",
    items: [
      { href: "/admin", label: "Overview", match: "exact" },
      { href: "/admin/transactions", label: "Transactions", match: "prefix" },
      { href: "/admin/review", label: "Review" },
    ],
  },
  {
    id: "move",
    label: "Move money",
    items: [
      { href: "/admin/payouts", label: "Payouts" },
      { href: "/admin/bulk", label: "Bulk" },
      { href: "/admin/collections", label: "Collect" },
      { href: "/admin/remittances", label: "Remit" },
    ],
  },
  {
    id: "rails",
    label: "Rails",
    items: [
      { href: "/admin/pawapay", label: "PawaPay" },
      { href: "/admin/fx", label: "FX" },
      { href: "/admin/treasury", label: "Treasury" },
    ],
  },
  {
    id: "access",
    label: "Access",
    items: [
      { href: "/admin/checkouts", label: "Links" },
      { href: "/docs", label: "API" },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  if (item.match === "prefix") {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function MenuIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 7h16M4 12h16M4 17h16"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function SwitchWalletIcon() {
  return (
    <svg
      className="h-4 w-4"
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
}

function NavLinkList({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-niko-muted/80">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-niko-teal/12 font-medium text-niko-teal"
                        : "text-niko-muted hover:bg-niko-well/70 hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                        active
                          ? "bg-niko-teal shadow-[0_0_0_3px_color-mix(in_srgb,var(--niko-teal)_22%,transparent)]"
                          : "bg-niko-border group-hover:bg-niko-muted"
                      }`}
                      aria-hidden
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SessionActions({
  endSession,
}: {
  endSession: (reason: "session_ended" | "wallet_changed") => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/app/pay"
        className="rounded-md border border-niko-border bg-niko-surface px-2.5 py-1.5 text-xs font-medium text-niko-muted transition-colors hover:border-niko-teal/40 hover:text-niko-teal"
      >
        App
      </Link>
      <button
        type="button"
        onClick={() => endSession("wallet_changed")}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-niko-border bg-niko-surface text-niko-muted outline-none transition-colors hover:border-niko-teal/40 hover:text-niko-teal"
        title="Switch wallet"
        aria-label="Switch wallet"
      >
        <SwitchWalletIcon />
      </button>
      <button
        type="button"
        onClick={() => endSession("session_ended")}
        className="rounded-md border border-niko-border bg-niko-surface px-2.5 py-1.5 text-xs font-medium text-niko-muted outline-none transition-colors hover:border-niko-teal/40 hover:text-niko-teal"
      >
        Logout
      </button>
      <ThemeToggle />
    </div>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const endSession = (reason: "session_ended" | "wallet_changed") => {
    clearAdminWalletKind();
    void Promise.all([revokeAdminSession(), disconnectWalletConnect()]).finally(
      () => {
        window.location.href = adminLoginPath(reason);
      },
    );
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-niko-border/60 bg-background/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-niko-border bg-niko-surface text-niko-muted lg:hidden"
              aria-expanded={open}
              aria-controls="admin-sidebar-drawer"
              onClick={() => setOpen(true)}
            >
              <span className="sr-only">Open navigation</span>
              <MenuIcon />
            </button>
            <Link href="/admin" className="flex items-center gap-2.5">
              <BrandLogo className="h-8" priority />
              <span className="rounded-md border border-niko-teal/35 bg-niko-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-niko-teal">
                ops
              </span>
            </Link>
          </div>
          <SessionActions endSession={endSession} />
        </div>
      </header>

      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-niko-border/50 bg-niko-band/40 pt-14 lg:block"
        aria-label="Admin sections"
      >
        <div className="flex h-full flex-col overflow-y-auto px-3 py-5">
          <NavLinkList pathname={pathname} />
          <div className="mt-auto border-t border-niko-border/40 px-3 pt-4">
            <p className="text-[11px] leading-relaxed text-niko-muted">
              NikoPay operations
            </p>
          </div>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <aside
            id="admin-sidebar-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-niko-border bg-background shadow-xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-niko-border/60 px-4">
              <p
                id={titleId}
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Admin menu
              </p>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-niko-border text-niko-muted"
                onClick={() => setOpen(false)}
              >
                <span className="sr-only">Close</span>
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-5">
              <NavLinkList
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
