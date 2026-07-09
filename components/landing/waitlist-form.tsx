"use client";

import { FormEvent, useState } from "react";

const roles = [
  { value: "", label: "I am a..." },
  { value: "freelancer", label: "Freelancer" },
  { value: "remote-worker", label: "Remote Worker" },
  { value: "business", label: "Business" },
  { value: "investor", label: "Investor" },
  { value: "other", label: "Other" },
];

type WaitlistFormProps = {
  compact?: boolean;
};

export function WaitlistForm({ compact = false }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: role || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("success");
      setEmail("");
      setRole("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  if (status === "success" && compact) {
    return (
      <p className="rounded-xl border border-niko-teal/30 bg-niko-teal/10 px-4 py-3 text-sm text-niko-teal">
        You&apos;re on the list! We&apos;ll notify you at launch.
      </p>
    );
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-niko-teal/30 bg-niko-teal/10 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-niko-teal/20">
          <svg
            className="h-6 w-6 text-niko-teal"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-foreground">
          You&apos;re on the list
        </h3>
        <p className="mt-2 text-niko-muted">
          We&apos;ll notify you when NikoPay launches in Rwanda.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-2" : "space-y-4"}>
      <div className={compact ? "flex gap-2" : "grid gap-4 sm:grid-cols-2"}>
        <input
          type="email"
          required
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`rounded-xl border border-niko-border bg-niko-surface px-4 text-foreground placeholder:text-niko-muted focus:border-niko-teal focus:outline-none focus:ring-1 focus:ring-niko-teal ${
            compact ? "h-11 flex-1 text-sm" : "h-12"
          }`}
        />
        {!compact && (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-12 rounded-xl border border-niko-border bg-niko-surface px-4 text-foreground focus:border-niko-teal focus:outline-none focus:ring-1 focus:ring-niko-teal"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={status === "loading"}
          className={`rounded-xl bg-niko-teal font-semibold text-niko-navy transition-colors hover:bg-niko-teal-bright disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-niko-teal ${
            compact ? "h-11 shrink-0 px-5 text-sm" : "h-12 sm:col-span-2"
          }`}
        >
          {status === "loading" ? "Joining..." : "Join Waitlist"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
