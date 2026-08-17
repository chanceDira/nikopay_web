"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { readLocal } from "@/lib/read-local";

const links = [
  { href: "/app/pay", label: "New payment" },
  { href: "/app/payments", label: "History" },
  { href: "/app/profile", label: "Profile" },
] as const;

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

export function AppNav() {
  const [theme, setTheme] = useState(() => readLocal("nikopay_theme", "dark"));

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
    <header className="fixed top-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
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
          <div className="flex items-center gap-6 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-niko-muted font-sans transition-colors hover:text-niko-teal"
              >
                {link.label}
              </Link>
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
          </div>
        </nav>
      </div>
    </header>
  );
}
