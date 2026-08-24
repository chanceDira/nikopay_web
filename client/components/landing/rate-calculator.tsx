"use client";

import { useEffect, useState } from "react";
import { isAborted, requestQuote } from "@/lib/pay-api";
import { formatRwf, formatUsdt } from "@/lib/rates";

const DEBOUNCE_MS = 400;
const DEFAULT_AMOUNT = "100";

type Payout = {
  netRwf: number;
  feeRwf: number;
  rate: number;
  feePercent: number;
};

type State = { payout: Payout | null; loading: boolean };

export function RateCalculator() {
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [state, setState] = useState<State>({ payout: null, loading: false });

  const parsed = parseFloat(amount) || 0;
  const isValid = parsed >= MOCK_RATE.minUsdt;
  const payout = isValid ? calculatePayout(parsed) : null;

  return (
    <div className="niko-glow w-full max-w-md rounded-md border border-niko-border bg-niko-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-niko-muted">
          Rate Calculator
        </span>
        <span className="flex items-center gap-1.5 text-xs text-niko-teal">
          <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-niko-teal" />
          Live rate
        </span>
      </div>

      <label htmlFor="usdt-amount" className="block text-sm text-niko-muted">
        You send
      </label>
      <div className="mt-2 flex items-center gap-3 rounded-md border border-niko-border bg-background px-4 py-3">
        <input
          id="usdt-amount"
          type="number"
          min={1}
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent font-mono text-xl font-semibold text-foreground outline-none"
        />
        <span className="shrink-0 text-sm font-medium text-niko-teal">
          USDT
        </span>
      </div>

      <div className="my-4 flex items-center justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-niko-border bg-niko-navy">
          <svg
            className="h-4 w-4 text-niko-teal"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>

      <p className="text-sm text-niko-muted">Recipient receives</p>
      <div className="mt-2 rounded-md border border-niko-teal/30 bg-niko-teal/5 px-4 py-4">
        <p className="font-mono text-2xl font-bold text-niko-teal-bright sm:text-3xl">
          {loading ? (
            <span className="animate-pulse text-niko-muted">...</span>
          ) : payout ? (
            formatRwf(payout.netRwf)
          ) : (
            "-"
          )}
        </p>
        <p className="mt-1 text-xs text-niko-muted">via MTN Mobile Money</p>
      </div>

      {payout && (
        <dl className="mt-4 space-y-2 border-t border-niko-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-niko-muted">Exchange rate</dt>
            <dd className="font-mono text-foreground">
              1 USDT = {payout.rate.toLocaleString()} RWF
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-niko-muted">
              Service fee ({payout.feePercent}%)
            </dt>
            <dd className="font-mono text-foreground">
              {formatRwf(payout.feeRwf)}
            </dd>
          </div>
          <div className="flex justify-between font-medium">
            <dt className="text-foreground">You send</dt>
            <dd className="font-mono text-foreground">{formatUsdt(parsed)}</dd>
          </div>
        </dl>
      )}

      <p className="mt-4 text-xs leading-relaxed text-niko-muted">
        Rates are indicative. Final rate locked at confirmation.
      </p>
    </div>
  );
}
