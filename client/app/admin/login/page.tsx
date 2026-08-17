"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !otp) {
      setError("Please fill in all fields (Email, Password, and 2FA Code).");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (otp.length !== 6 || isNaN(Number(otp))) {
      setError("The 2FA Code must be exactly 6 digits.");
      return;
    }

    setLoading(true);

    // Simulate Admin authentication network delay
    setTimeout(() => {
      setLoading(false);
      // Save administrative session flag
      localStorage.setItem("nikopay_admin_session", "true");
      // Redirect to the operational admin panel
      router.push("/admin");
    }, 1500);
  };

  return (
    <main className="flex min-h-screen flex-col justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Primary navy/cyan warning-toned decorative background glow for admin safety area */}
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

        <div className="mb-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-niko-teal/20 bg-niko-teal/5 px-3 py-1 text-center text-xs font-semibold text-niko-teal max-w-max mx-auto block">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 15v2m0 0v3m0-3h3m-3 0H9m12-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Restricted Administration System
        </div>

        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground mt-2">
          Ops Console Login
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-niko-surface/60 border border-niko-border py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-sm">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {error}
              </div>
            )}

            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-foreground uppercase tracking-wider"
              >
                Admin Email
              </label>
              <div className="mt-1.5">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  className="block w-full rounded-xl border border-niko-border bg-background px-4 py-3 text-foreground shadow-sm focus:border-niko-teal/30 focus:ring-1 focus:ring-niko-teal/30 sm:text-sm outline-none transition-colors font-sans"
                  placeholder="admin@nikopay.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-foreground uppercase tracking-wider"
              >
                Secret Password
              </label>
              <div className="mt-1.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  className="block w-full rounded-xl border border-niko-border bg-background px-4 py-3 text-foreground shadow-sm focus:border-niko-teal/30 focus:ring-1 focus:ring-niko-teal/30 sm:text-sm outline-none transition-colors font-sans"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* 2FA Token Code */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="otp"
                  className="block text-xs font-medium text-foreground uppercase tracking-wider"
                >
                  2FA Authenticator Code
                </label>
                <span className="text-[10px] text-niko-muted font-mono select-none">
                  Google / Authy
                </span>
              </div>
              <div className="mt-1.5">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => {
                    // Only allow digits
                    const val = e.target.value.replace(/\D/g, "");
                    setOtp(val);
                    if (error) setError("");
                  }}
                  className="block w-full rounded-xl border border-niko-border bg-background px-4 py-3 text-center text-lg font-bold tracking-[0.25em] text-foreground shadow-sm focus:border-niko-teal/30 focus:ring-1 focus:ring-niko-teal/30 outline-none transition-colors font-mono"
                  placeholder="000000"
                />
              </div>
            </div>

            {/* Remember device notice */}
            <div className="p-3 bg-background/30 rounded-lg border border-niko-border/40 text-[10px] text-niko-muted leading-relaxed">
              <strong>Notice:</strong> Privileged sessions are logged.
              Unrecognized IP locations will trigger a mandatory hardware
              verification request.
            </div>

            {/* Sign In Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center rounded-xl bg-niko-teal px-4 py-3.5 text-sm font-bold text-niko-navy shadow-[0_0_15px_rgba(0,212,200,0.2)] hover:bg-niko-teal-bright transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Verify & Log In"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
