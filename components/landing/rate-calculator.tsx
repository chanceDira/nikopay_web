"use client";

import { useEffect, useRef, useState } from "react";
import { isAborted, requestQuote } from "@/lib/pay-api";
import { formatRwf, formatUsdt } from "@/lib/rates";
import { usdtForTargetRwf } from "@/lib/settlement/quote";

const DEBOUNCE_MS = 400;
const DEFAULT_AMOUNT = "100";
const PROBE_USDT = 100;

type Direction = "usdt-to-rwf" | "rwf-to-usdt";

type Payout = {
  usdtAmount: number;
  netRwf: number;
  feeRwf: number;
  rate: number;
  feePercent: number;
};

type Fx = {
  rate: number;
  feePercent: number;
};

type State = { payout: Payout | null; loading: boolean };

export function RateCalculator() {
  const [direction, setDirection] = useState<Direction>("usdt-to-rwf");
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [state, setState] = useState<State>({ payout: null, loading: false });
  const fxRef = useRef<Fx | null>(null);

  const parsed = parseFloat(amount) || 0;
  const sendingUsdt = direction === "usdt-to-rwf";

  useEffect(() => {
    if (parsed <= 0) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setState((prev) => ({ ...prev, loading: true }));

      let usdtAmount = parsed;
      if (!sendingUsdt) {
        let fx = fxRef.current;
        if (!fx) {
          const probe = await requestQuote(
            PROBE_USDT,
            "base",
            controller.signal,
          );
          if (cancelled || controller.signal.aborted || isAborted(probe)) {
            return;
          }
          if (!probe.ok) {
            setState({ loading: false, payout: null });
            return;
          }
          fx = { rate: probe.data.rate, feePercent: probe.data.feePercent };
          fxRef.current = fx;
        }

        const inverted = usdtForTargetRwf(parsed, fx.rate, fx.feePercent);
        if (!inverted) {
          setState({ loading: false, payout: null });
          return;
        }
        usdtAmount = inverted;
      }

      const result = await requestQuote(usdtAmount, "base", controller.signal);
      if (cancelled || controller.signal.aborted || isAborted(result)) return;

      if (result.ok) {
        fxRef.current = {
          rate: result.data.rate,
          feePercent: result.data.feePercent,
        };
        setState({
          loading: false,
          payout: {
            usdtAmount: result.data.usdtAmount,
            netRwf: result.data.netRwf,
            feeRwf: result.data.feeRwf,
            rate: result.data.rate,
            feePercent: result.data.feePercent,
          },
        });
      } else {
        setState({ loading: false, payout: null });
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [parsed, sendingUsdt]);

  const { payout, loading } = state;

  const swapDirection = () => {
    if (payout) {
      setAmount(
        sendingUsdt
          ? String(Math.round(payout.netRwf))
          : String(payout.usdtAmount),
      );
    }
    setDirection((current) =>
      current === "usdt-to-rwf" ? "rwf-to-usdt" : "usdt-to-rwf",
    );
  };

  const inputLabel = sendingUsdt ? "You send" : "Recipient receives";
  const inputCurrency = sendingUsdt ? "USDT" : "RWF";
  const resultLabel = sendingUsdt ? "Recipient receives" : "You send";
  const resultHint = sendingUsdt ? "via MTN Mobile Money" : "from your wallet";

  return (
    <div className="niko-glow w-full max-w-md rounded-md border border-niko-border bg-niko-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-niko-muted">
          Rate Calculator
        </span>
        <span className="flex items-center gap-1.5 text-xs text-niko-teal">
          <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-niko-teal" />
          Live exchange
        </span>
      </div>

      <label htmlFor="calc-amount" className="block text-sm text-niko-muted">
        {inputLabel}
      </label>
      <div className="mt-2 flex items-center gap-3 rounded-md border border-niko-border bg-background px-4 py-3">
        <input
          id="calc-amount"
          type="number"
          min={1}
          step={sendingUsdt ? "0.01" : "1"}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent font-mono text-xl font-semibold text-foreground outline-none"
        />
        <span className="shrink-0 text-sm font-medium text-niko-teal">
          {inputCurrency}
        </span>
      </div>

      <div className="my-4 flex items-center justify-center">
        <button
          type="button"
          onClick={swapDirection}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-niko-border bg-niko-navy text-niko-teal transition-colors hover:border-niko-teal/50 hover:bg-niko-surface"
          aria-label={
            sendingUsdt
              ? "Switch to RWF to USDT"
              : "Switch to USDT to RWF"
          }
        >
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
              d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      <p className="text-sm text-niko-muted">{resultLabel}</p>
      <div className="mt-2 rounded-md border border-niko-teal/30 bg-niko-teal/5 px-4 py-4">
        <p className="font-mono text-2xl font-bold text-niko-teal-bright sm:text-3xl">
          {loading ? (
            <span className="animate-pulse text-niko-muted">...</span>
          ) : payout ? (
            sendingUsdt ? (
              formatRwf(payout.netRwf)
            ) : (
              formatUsdt(payout.usdtAmount)
            )
          ) : (
            "-"
          )}
        </p>
        <p className="mt-1 text-xs text-niko-muted">via mobile money</p>
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
            <dd className="font-mono text-foreground">
              {formatUsdt(payout.usdtAmount)}
            </dd>
          </div>
        </dl>
      )}

      <p className="mt-4 text-xs leading-relaxed text-niko-muted">
        Rates are indicative. Final rate locked at confirmation.
      </p>
    </div>
  );
}
