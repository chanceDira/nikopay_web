"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

const navLinks = [
  { href: "#how-it-works", label: "How it Works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

const SunIcon = () => (
  <svg
    className="h-4.5 w-4.5 text-niko-teal"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"
    />
  </svg>
);

const MoonIcon = () => (
  <svg
    className="h-4.5 w-4.5 text-niko-teal"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<string>("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeTheme = localStorage.getItem("nikopay_theme") || "dark";
      setTheme(activeTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("nikopay_theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-4xl rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-xl shadow-2xl transition-all p-3 sm:px-6">
        <nav
          className="flex items-center justify-between"
          aria-label="Main navigation"
        >
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/nikopay-logo.png"
              alt="NikoPay"
              width={130}
              height={36}
              className="h-8 w-auto sm:h-8.5"
              priority
            />
          </Link>

          {/* Desktop Links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-sans text-niko-muted transition-colors hover:text-niko-teal"
              >
                {link.label}
              </a>
            ))}

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-niko-border bg-background/50 hover:border-niko-teal/40 hover:bg-niko-surface transition-all cursor-pointer text-foreground outline-none"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>

            <Link
              href="/auth/sign-in"
              className="rounded-md bg-niko-teal px-5 py-2.5 text-sm font-sans font-bold text-niko-navy hover:bg-niko-teal-bright transition-colors"
            >
              Launch App
            </Link>
          </div>

          {/* Mobile Actions Cluster */}
          <div className="flex items-center gap-3 md:hidden">
            {/* Mobile Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-niko-border bg-background/50 text-foreground cursor-pointer outline-none"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-niko-border text-foreground cursor-pointer outline-none"
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

        {/* Mobile Menu Panel (Self-contained in the floating card) */}
        {open && (
          <div
            id="mobile-menu"
            className="mt-4 border-t border-niko-border/40 pt-4 flex flex-col gap-3 md:hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm text-niko-muted hover:bg-niko-surface/40 hover:text-niko-teal font-sans"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/auth/sign-in"
              className="rounded-md bg-niko-teal px-5 py-2.5 text-center text-sm font-sans font-bold text-niko-navy"
              onClick={() => setOpen(false)}
            >
              Launch App
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
