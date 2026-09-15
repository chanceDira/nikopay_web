"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_FX_CURRENCY } from "@/lib/fx-currencies";
import { isAborted, listQuoteCurrencies, requestQuote } from "@/lib/pay-api";
import { MAX_USDT } from "@/lib/quote-limits";
import { formatLocalAmount, formatUsdt } from "@/lib/rates";
import { usdtForTargetLocal } from "@/lib/settlement/quote";

const DEBOUNCE_MS = 400;
const DEFAULT_AMOUNT = "100";
const PROBE_USDT = 100;

type Direction = "usdt-to-local" | "local-to-usdt";

type Payout = {
  usdtAmount: number;
  netLocal: number;
  feeLocal: number;
  rate: number;
  feePercent: number;
  currency: string;
};

type Fx = {
  rate: number;
  feePercent: number;
  currency: string;
};

type State = {
  payout: Payout | null;
  loading: boolean;
  error: string | null;
};

function resolveUsdtAmount(
  parsed: number,
  sendingUsdt: boolean,
  fx: Fx | null,
  currency: string,
): { ok: true; usdtAmount: number } | { ok: false; error: string } {
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }

  if (sendingUsdt) {
    if (parsed > MAX_USDT) {
      return {
        ok: false,
        error: `Enter up to ${MAX_USDT.toLocaleString()} USDT.`,
      };
    }
    return { ok: true, usdtAmount: parsed };
  }

  if (!fx || fx.currency !== currency) {
    return { ok: false, error: "Unable to load exchange rate." };
  }

  const inverted = usdtForTargetLocal(parsed, fx.rate, fx.feePercent);
  if (!inverted) {
    return { ok: false, error: "Unable to convert that amount." };
  }
  if (inverted > MAX_USDT) {
    return {
      ok: false,
      error: `That payout needs more than ${MAX_USDT.toLocaleString()} USDT. Enter a smaller ${currency} amount.`,
    };
  }
  return { ok: true, usdtAmount: inverted };
}

export function RateCalculator() {
  const [direction, setDirection] = useState<Direction>("usdt-to-local");
  const [currency, setCurrency] = useState(DEFAULT_FX_CURRENCY);
  const [currencies, setCurrencies] = useState<string[]>([DEFAULT_FX_CURRENCY]);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [state, setState] = useState<State>({
    payout: null,
    loading: false,
    error: null,
  });
  const fxRef = useRef<Fx | null>(null);

  const parsed = parseFloat(amount) || 0;
  const sendingUsdt = direction === "usdt-to-local";

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const result = await listQuoteCurrencies(controller.signal);
      if (controller.signal.aborted || isAborted(result) || !result.ok) {
        return;
      }
      if (result.data.currencies.length === 0) {
        return;
      }
      setCurrencies(result.data.currencies);
      setCurrency((current) =>
        result.data.currencies.includes(current)
          ? current
          : result.data.currencies[0],
      );
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const delay = parsed <= 0 ? 0 : DEBOUNCE_MS;

    const timer = window.setTimeout(async () => {
      if (parsed <= 0) {
        setState({ payout: null, loading: false, error: null });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      if (sendingUsdt) {
        const check = resolveUsdtAmount(parsed, true, null, currency);
        if (!check.ok) {
          setState({ payout: null, loading: false, error: check.error });
          return;
        }
      } else if (!fxRef.current || fxRef.current.currency !== currency) {
        const probe = await requestQuote(
          PROBE_USDT,
          "base",
          controller.signal,
          currency,
        );
        if (cancelled || controller.signal.aborted || isAborted(probe)) {
          return;
        }
        if (!probe.ok) {
          setState({
            payout: null,
            loading: false,
            error: probe.reason || "Unable to load exchange rate.",
          });
          return;
        }
        fxRef.current = {
          rate: probe.data.rate,
          feePercent: probe.data.feePercent,
          currency: probe.data.currency,
        };
      }

      const check = resolveUsdtAmount(
        parsed,
        sendingUsdt,
        fxRef.current,
        currency,
      );
      if (!check.ok) {
        setState({ payout: null, loading: false, error: check.error });
        return;
      }

      const result = await requestQuote(
        check.usdtAmount,
        "base",
        controller.signal,
        currency,
      );
      if (cancelled || controller.signal.aborted || isAborted(result)) {
        return;
      }

      if (result.ok) {
        fxRef.current = {
          rate: result.data.rate,
          feePercent: result.data.feePercent,
          currency: result.data.currency,
        };
        setState({
          loading: false,
          error: null,
          payout: {
            usdtAmount: result.data.usdtAmount,
            netLocal: result.data.netLocal,
            feeLocal: result.data.feeLocal,
            rate: result.data.rate,
            feePercent: result.data.feePercent,
            currency: result.data.currency,
          },
        });
        return;
      }

      setState({
        payout: null,
        loading: false,
        error: result.reason || "Unable to get a quote for that amount.",
      });
    }, delay);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [parsed, sendingUsdt, currency]);

  const { payout, loading, error } = state;

  const changeCurrency = (next: string) => {
    if (next === currency) {
      return;
    }
    fxRef.current = null;
    setState({ payout: null, error: null, loading: true });
    setCurrency(next);
  };

  const swapDirection = () => {
    if (payout) {
      setAmount(
        sendingUsdt
          ? String(Math.round(payout.netLocal))
          : String(payout.usdtAmount),
      );
    }
    setDirection((current) =>
      current === "usdt-to-local" ? "local-to-usdt" : "usdt-to-local",
    );
  };

  const inputLabel = sendingUsdt ? "You send" : "Recipient receives";
  const resultLabel = sendingUsdt ? "Recipient receives" : "You send";
  const resultHint = sendingUsdt ? "via mobile money" : "from your wallet";

  return (
    <div className="niko-glow w-full max-w-md rounded-md border border-niko-border bg-niko-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-niko-muted">
          Rate calculator
        </span>
        <span className="flex items-center gap-1.5 text-xs text-niko-teal">
          <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-niko-teal" />
          Live exchange
        </span>
      </div>

      <label htmlFor="calc-amount" className="block text-sm text-niko-muted">
        {inputLabel}
      </label>
      <div className="niko-field mt-2 flex items-center gap-3 rounded-md px-4 py-3">
        <input
          id="calc-amount"
          type="number"
          min={1}
          max={sendingUsdt ? MAX_USDT : undefined}
          step={sendingUsdt ? "0.01" : "1"}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent font-mono text-xl font-semibold text-foreground outline-none"
        />
        {sendingUsdt ? (
          <span className="shrink-0 text-sm font-medium text-niko-teal">
            USDT
          </span>
        ) : (
          <CurrencySelect
            id="calc-currency-in"
            value={currency}
            options={currencies}
            onChange={changeCurrency}
          />
        )}
      </div>

      <div className="my-4 flex items-center justify-center">
        <button
          type="button"
          onClick={swapDirection}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-niko-border bg-niko-well text-niko-teal hover:border-niko-teal/50"
          aria-label={
            sendingUsdt
              ? `Switch to ${currency} to USDT`
              : `Switch to USDT to ${currency}`
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

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-niko-muted">{resultLabel}</p>
        {sendingUsdt ? (
          <CurrencySelect
            id="calc-currency-out"
            value={currency}
            options={currencies}
            onChange={changeCurrency}
          />
        ) : null}
      </div>
      <div className="mt-2 rounded-md border border-niko-teal/30 bg-niko-teal/5 px-4 py-4">
        <p className="font-mono text-2xl font-bold text-niko-teal-bright sm:text-3xl">
          {loading ? (
            <span className="animate-pulse text-niko-muted">...</span>
          ) : payout ? (
            sendingUsdt ? (
              formatLocalAmount(payout.netLocal, payout.currency)
            ) : (
              formatUsdt(payout.usdtAmount)
            )
          ) : (
            "-"
          )}
        </p>
        <p className="mt-1 text-xs text-niko-muted">{resultHint}</p>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      {payout && (
        <dl className="mt-4 space-y-2 border-t border-niko-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-niko-muted">Exchange rate</dt>
            <dd className="font-mono text-foreground">
              1 USDT = {payout.rate.toLocaleString()} {payout.currency}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-niko-muted">
              Service fee ({payout.feePercent}%)
            </dt>
            <dd className="font-mono text-foreground">
              {formatLocalAmount(payout.feeLocal, payout.currency)}
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
        Preview only. Quotes up to {MAX_USDT.toLocaleString()} USDT. Rate locks
        when you confirm.
      </p>
    </div>
  );
}

function CurrencySelect({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  onChange: (currency: string) => void;
}) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Payout currency
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 shrink-0 cursor-pointer rounded-md border-0 bg-transparent py-0 pl-2 text-sm font-medium leading-none text-niko-teal outline-none"
      >
        {options.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </>
  );
}
