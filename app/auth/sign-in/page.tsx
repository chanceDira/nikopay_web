"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
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

    setLoading(true);

    // Simulate login network delay
    setTimeout(() => {
      setLoading(false);
      // Redirect to the customer pay wizard
      router.push("/app/pay");
    }, 1000);
  };

  return (
    <main className="flex min-h-full flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-foreground">
          Sign in to NikoPay
        </h2>
        <p className="mt-2 text-center text-sm text-niko-muted">
          Access your fast, instant crypto-to-fiat payment portal.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-niko-surface/60 border border-niko-border py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Email address
              </label>
              <div className="mt-2">
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
                  className="block w-full rounded-xl border border-niko-border bg-background px-4 py-3 text-foreground shadow-sm focus:border-niko-teal/50 focus:ring-1 focus:ring-niko-teal/50 sm:text-sm outline-none transition-colors font-sans"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <div className="text-sm">
                  <a
                    href="#"
                    className="font-semibold text-niko-teal hover:text-niko-teal-bright text-xs transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>
              <div className="mt-2">
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
                  className="block w-full rounded-xl border border-niko-border bg-background px-4 py-3 text-foreground shadow-sm focus:border-niko-teal/50 focus:ring-1 focus:ring-niko-teal/50 sm:text-sm outline-none transition-colors font-sans"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-niko-border bg-background text-niko-teal focus:ring-niko-teal/50"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-xs text-niko-muted"
                >
                  Remember me
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-xl bg-niko-teal px-4 py-3.5 text-sm font-bold text-niko-navy shadow-[0_0_15px_rgba(0,212,200,0.1)] hover:bg-niko-teal-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-niko-teal transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-niko-navy border-t-transparent" />
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-niko-border/60 pt-6">
            <div className="relative flex justify-center text-xs">
              <span className="bg-transparent px-2 text-niko-muted">
                Demo Account Details
              </span>
            </div>
            <p className="mt-2 text-center text-[10px] text-niko-muted/80 leading-relaxed font-mono bg-background/40 p-2.5 rounded-lg border border-niko-border/40">
              This is a prototype flow. Enter any valid email and a 6+ character
              password to sign in.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
