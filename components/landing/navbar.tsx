"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const navLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#faq", label: "FAQ" },
  { href: "/download", label: "Get the app" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="pointer-events-none fixed top-6 right-0 left-0 z-50 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-4xl rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] p-3 shadow-2xl backdrop-blur-xl sm:px-6">
        <nav
          className="flex items-center justify-between"
          aria-label="Main navigation"
        >
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo className="h-8 sm:h-8.5" priority />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-niko-muted transition-colors hover:text-niko-teal"
              >
                {link.label}
              </a>
            ))}

            <ThemeToggle />

            <Link
              href="/auth/sign-in"
              className="rounded-md bg-niko-teal px-5 py-2.5 text-sm font-semibold text-niko-on-accent hover:bg-niko-teal-bright"
            >
              Pay now
            </Link>
          </div>

          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle className="h-10 w-10" />

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-niko-border text-foreground outline-none"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen(!open)}
            >
              <span className="sr-only">{open ? "Close" : "Menu"}</span>
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                {open ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {open && (
          <div
            id="mobile-menu"
            className="mt-4 flex flex-col gap-3 border-t border-niko-border/40 pt-4 md:hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm text-niko-muted hover:bg-niko-surface hover:text-niko-teal"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/auth/sign-in"
              className="rounded-md bg-niko-teal px-5 py-2.5 text-center text-sm font-semibold text-niko-on-accent"
              onClick={() => setOpen(false)}
            >
              Pay now
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
