"use client";

import { useEffect, useState } from "react";
import {
  currentRatesByCurrency,
  DEFAULT_FX_CURRENCY,
  latestRateForCurrency,
} from "@/lib/fx-currencies";

type RateRow = {
  currency: string;
  rate: number;
  feePercent: number;
  minUsdt: number;
  effectiveFrom: string;
  createdAt: string;
};

type FormState = "idle" | "saving" | "success" | "error";

const HEADERS = { "Content-Type": "application/json" };
const DEFAULT_FEE_PERCENT = 1.5;
const DEFAULT_MIN_USDT = 0.1;

async function fetchFxPayload(): Promise<{
  rates: RateRow[];
  currencies: string[];
} | null> {
  const res = await fetch("/api/admin/fx");
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as {
    data: { rates?: RateRow[]; currencies?: string[] };
  };
  const rates = json.data.rates ?? [];
  const currencies = json.data.currencies?.length
    ? json.data.currencies
    : [DEFAULT_FX_CURRENCY];
  return { rates, currencies };
}

export function AdminFxForm() {
  const [history, setHistory] = useState<RateRow[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([DEFAULT_FX_CURRENCY]);
  const [currency, setCurrency] = useState(DEFAULT_FX_CURRENCY);
  const [historyFilter, setHistoryFilter] = useState<"all" | string>("all");
  const [rate, setRate] = useState(0);
  const [feePercent, setFeePercent] = useState(DEFAULT_FEE_PERCENT);
  const [minUsdt, setMinUsdt] = useState(DEFAULT_MIN_USDT);
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const fillForm = (code: string, rows: RateRow[]) => {
    const latest = latestRateForCurrency(rows, code);
    setCurrency(code);
    setRate(latest?.rate ?? 0);
    setFeePercent(latest?.feePercent ?? DEFAULT_FEE_PERCENT);
    setMinUsdt(latest?.minUsdt ?? DEFAULT_MIN_USDT);
  };

  const loadHistory = async (selected = currency) => {
    const payload = await fetchFxPayload();
    if (!payload) return;
    setHistory(payload.rates);
    setCurrencies(payload.currencies);
    const next = payload.currencies.includes(selected)
      ? selected
      : DEFAULT_FX_CURRENCY;
    fillForm(next, payload.rates);
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const payload = await fetchFxPayload();
      if (!payload || cancelled) return;
      setHistory(payload.rates);
      setCurrencies(payload.currencies);
      const next = payload.currencies.includes(DEFAULT_FX_CURRENCY)
        ? DEFAULT_FX_CURRENCY
        : payload.currencies[0];
      fillForm(next, payload.rates);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const handleCurrencyChange = (code: string) => {
    fillForm(code, history);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setFormState("saving");

    const res = await fetch("/api/admin/fx", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ currency, rate, feePercent, minUsdt }),
    });

    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setErrorMsg(json.error ?? "Could not save rate.");
      setFormState("error");
      return;
    }

    setFormState("success");
    void loadHistory(currency);
    setTimeout(() => setFormState("idle"), 3000);
  };

  const liveRates = currentRatesByCurrency(history);
  const filteredHistory =
    historyFilter === "all"
      ? history
      : history.filter((row) => row.currency === historyFilter);
  const selectedLive = latestRateForCurrency(history, currency);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md h-fit">
        <h4 className="text-sm font-semibold text-niko-teal mb-4">Set rate</h4>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label
              htmlFor="fx-currency"
              className="block text-xs font-medium text-foreground mb-1.5"
            >
              Currency
            </label>
            <select
              id="fx-currency"
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full bg-background border border-niko-border text-foreground px-3 py-2 text-sm font-mono rounded-md outline-none focus:border-niko-teal/50 cursor-pointer"
            >
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                  {code === DEFAULT_FX_CURRENCY ? " (default)" : ""}
                </option>
              ))}
            </select>
            {!selectedLive ? (
              <p className="mt-1.5 text-[11px] text-niko-muted">
                No live rate for {currency} yet.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="fx-rate"
              className="block text-xs font-medium text-foreground mb-1.5"
            >
              USDT to {currency} rate
            </label>
            <div className="relative rounded-md border border-niko-border bg-background px-3 py-2 focus-within:border-niko-teal/50 transition-colors">
              <input
                id="fx-rate"
                type="number"
                step="any"
                required
                min="0"
                value={rate || ""}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-mono text-sm text-foreground outline-none"
              />
              <span className="absolute right-3 top-2.5 font-mono text-xs text-niko-muted font-bold">
                {currency}
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="fx-fee"
              className="block text-xs font-medium text-foreground mb-1.5"
            >
              Fee
            </label>
            <div className="relative rounded-md border border-niko-border bg-background px-3 py-2 focus-within:border-niko-teal/50 transition-colors">
              <input
                id="fx-fee"
                type="number"
                step="any"
                required
                min="0"
                value={feePercent}
                onChange={(e) => setFeePercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-mono text-sm text-foreground outline-none"
              />
              <span className="absolute right-3 top-2.5 font-mono text-xs text-niko-muted font-bold">
                %
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="fx-min"
              className="block text-xs font-medium text-foreground mb-1.5"
            >
              Minimum USDT
            </label>
            <div className="relative rounded-md border border-niko-border bg-background px-3 py-2 focus-within:border-niko-teal/50 transition-colors">
              <input
                id="fx-min"
                type="number"
                step="any"
                required
                min="0"
                value={minUsdt}
                onChange={(e) => setMinUsdt(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-mono text-sm text-foreground outline-none"
              />
              <span className="absolute right-3 top-2.5 font-mono text-xs text-niko-muted font-bold">
                USDT
              </span>
            </div>
          </div>

          {formState === "error" && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          {formState === "success" && (
            <div className="p-3 rounded-md bg-niko-teal/15 border border-niko-teal/20 text-niko-teal text-xs">
              Saved {currency} rate.
            </div>
          )}

          <button
            type="submit"
            disabled={formState === "saving"}
            className="w-full py-2.5 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {formState === "saving" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-niko-navy border-t-transparent" />
            ) : (
              `Save ${currency} rate`
            )}
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-8">
        <RateTable
          title="Live rates"
          empty="No live rates yet."
          rows={liveRates}
          selected={currency}
          onSelect={handleCurrencyChange}
        />

        <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-semibold text-niko-teal">History</h4>
            <select
              aria-label="Filter history by currency"
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="bg-background border border-niko-border text-foreground px-3 py-1.5 text-xs font-mono rounded-md outline-none focus:border-niko-teal/50 cursor-pointer"
            >
              <option value="all">All currencies</option>
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <RateTableBody
            empty="No rate history yet."
            rows={filteredHistory}
            selected={currency}
            onSelect={handleCurrencyChange}
            showWhen
          />
        </div>
      </div>
    </div>
  );
}

function RateTable(props: {
  title: string;
  empty: string;
  rows: RateRow[];
  selected: string;
  onSelect: (currency: string) => void;
}) {
  return (
    <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
      <h4 className="text-sm font-semibold text-niko-teal mb-4">
        {props.title}
      </h4>
      <RateTableBody
        empty={props.empty}
        rows={props.rows}
        selected={props.selected}
        onSelect={props.onSelect}
        showWhen
      />
    </div>
  );
}

function RateTableBody(props: {
  empty: string;
  rows: RateRow[];
  selected: string;
  onSelect: (currency: string) => void;
  showWhen?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded border border-niko-border/20 bg-background/50">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-niko-border/30 bg-niko-surface/20 text-niko-muted">
            {props.showWhen ? (
              <th className="px-4 py-3 font-medium">When</th>
            ) : null}
            <th className="px-4 py-3 font-medium">Currency</th>
            <th className="px-4 py-3 font-medium text-right">Rate</th>
            <th className="px-4 py-3 font-medium text-right">Fee</th>
            <th className="px-4 py-3 font-medium text-right">Min</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-niko-border/10 font-mono text-foreground">
          {props.rows.length === 0 ? (
            <tr>
              <td
                colSpan={props.showWhen ? 5 : 4}
                className="px-4 py-6 text-center text-niko-muted font-sans text-xs"
              >
                {props.empty}
              </td>
            </tr>
          ) : (
            props.rows.map((row) => {
              const active = row.currency === props.selected;
              return (
                <tr
                  key={`${row.currency}-${row.effectiveFrom}`}
                  className={`transition-colors ${
                    active ? "bg-niko-teal/10" : "hover:bg-niko-surface/10"
                  }`}
                >
                  {props.showWhen ? (
                    <td className="px-4 py-3 text-foreground/80 font-sans whitespace-nowrap">
                      {formatDate(row.effectiveFrom)}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => props.onSelect(row.currency)}
                      className="font-semibold text-foreground hover:text-niko-teal cursor-pointer"
                    >
                      {row.currency}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.rate}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-niko-teal-bright">
                    {row.feePercent}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    {row.minUsdt} USDT
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
