"use client";

import { useEffect, useState } from "react";
import { DEFAULT_FX_CURRENCY } from "@/lib/fx-currencies";
import { isAborted, listQuoteCurrencies, requestQuote } from "@/lib/pay-api";
import { MAX_USDT } from "@/lib/quote-limits";
import { formatLocalAmount, formatUsdt } from "@/lib/rates";
import { defaultCountryForCurrency } from "@/lib/settlement/corridor-fee-defaults";

const DEBOUNCE_MS = 400;
const DEFAULT_AMOUNT = "100";

type Direction = "usdt-to-local" | "local-to-usdt";

type Payout = {
  usdtAmount: number;
  netLocal: number;
  rate: number;
  currency: string;
};

type State = {
  payout: Payout | null;
  loading: boolean;
  error: string | null;
};

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

      if (sendingUsdt && parsed > MAX_USDT) {
        setState({
          payout: null,
          loading: false,
          error: `Enter up to ${MAX_USDT.toLocaleString()} USDT.`,
        });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      const country = defaultCountryForCurrency(currency);
      const result = sendingUsdt
        ? await requestQuote({
            usdtAmount: parsed,
            chain: "base",
            currency,
            country,
            signal: controller.signal,
          })
        : await requestQuote({
            netLocal: parsed,
            chain: "base",
            currency,
            country,
            signal: controller.signal,
          });
      if (cancelled || controller.signal.aborted || isAborted(result)) {
        return;
      }

      if (result.ok) {
        setState({
          loading: false,
          error: null,
          payout: {
            usdtAmount: result.data.usdtAmount,
            netLocal: result.data.netLocal,
            rate: result.data.rate,
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

      {payout ? (
        <p className="mt-3 font-mono text-sm text-niko-muted">
          1 USDT = {payout.rate.toLocaleString()} {payout.currency}
        </p>
      ) : null}

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
