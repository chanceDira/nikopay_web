"use client";

import { useEffect, useState } from "react";
import { isAborted, requestQuote } from "@/lib/pay-api";
import { MAX_USDT } from "@/lib/quote-limits";
import { type CorridorFees } from "@/lib/settlement/quote";
import type { ChainId, Quote } from "@/lib/settlement/types";

const QUOTE_PROBE_USDT = 10;
const QUOTE_DEBOUNCE_MS = 300;

export type AmountEntry = "local" | "usdt";

/** @deprecated use AmountEntry "local" */
export type LegacyAmountEntry = "rwf" | "usdt";

type QuoteStatus = "idle" | "loading" | "ready" | "error";

type LiveFx = {
  rate: number;
  feePercent: number;
  currency: string;
  fees: CorridorFees;
};

type Snapshot = {
  key: string;
  chain: ChainId;
  currency: string;
  quote: Quote | null;
  fx: LiveFx | null;
  status: QuoteStatus;
  error: string;
  fundsError: string;
};

function feesFromQuote(quote: Quote): CorridorFees {
  return {
    pawapayPercent: quote.pawapayPercent,
    mnoFixed: quote.mnoFixed,
    nikopayPercent: quote.feePercent,
  };
}

export function useLiveQuote(input: {
  chain: ChainId;
  currency: string;
  country?: string;
  provider?: string;
  entry: AmountEntry | LegacyAmountEntry;
  localPayout: number;
  usdtSell: number;
  /** @deprecated use localPayout */
  rwfPayout?: number;
}) {
  const currency = input.currency.trim().toUpperCase() || "RWF";
  const country = input.country?.trim().toUpperCase() || "";
  const provider = input.provider?.trim().toUpperCase() || "";
  const entry: AmountEntry =
    input.entry === "rwf" ? "local" : (input.entry as AmountEntry);
  const localPayout =
    input.localPayout > 0 ? input.localPayout : (input.rwfPayout ?? 0);
  const { chain, usdtSell } = input;
  const activeAmount =
    entry === "local"
      ? localPayout > 0
        ? localPayout
        : 0
      : usdtSell > 0
        ? usdtSell
        : 0;
  const requestKey = `${chain}:${country}:${provider}:${currency}:${entry}:${activeAmount}`;
  const [snapshot, setSnapshot] = useState<Snapshot>({
    key: "",
    chain,
    currency,
    quote: null,
    fx: null,
    status: "idle",
    error: "",
    fundsError: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    const delay = activeAmount > 0 ? QUOTE_DEBOUNCE_MS : 0;

    const timer = window.setTimeout(async () => {
      const probe = await requestQuote({
        usdtAmount: QUOTE_PROBE_USDT,
        chain,
        currency,
        country: country || undefined,
        provider: provider || undefined,
        checkFunds: false,
        signal: controller.signal,
      });
      if (controller.signal.aborted || isAborted(probe)) {
        return;
      }
      if (!probe.ok) {
        setSnapshot({
          key: requestKey,
          chain,
          currency,
          quote: null,
          fx: null,
          status: "error",
          error: probe.reason,
          fundsError: "",
        });
        return;
      }

      const liveFx: LiveFx = {
        rate: probe.data.rate,
        feePercent: probe.data.feePercent,
        currency: probe.data.currency,
        fees: feesFromQuote(probe.data),
      };

      if (activeAmount <= 0) {
        setSnapshot({
          key: requestKey,
          chain,
          currency,
          quote: null,
          fx: liveFx,
          status: "ready",
          error: "",
          fundsError: "",
        });
        return;
      }

      const quoted =
        entry === "local"
          ? await requestQuote({
              netLocal: localPayout,
              chain,
              currency,
              country: country || undefined,
              provider: provider || undefined,
              signal: controller.signal,
            })
          : await requestQuote({
              usdtAmount: usdtSell,
              chain,
              currency,
              country: country || undefined,
              provider: provider || undefined,
              signal: controller.signal,
            });

      if (controller.signal.aborted || isAborted(quoted)) {
        return;
      }
      if (!quoted.ok) {
        setSnapshot({
          key: requestKey,
          chain,
          currency,
          quote: null,
          fx: liveFx,
          status: "error",
          error: quoted.reason,
          fundsError: "",
        });
        return;
      }

      if (quoted.data.usdtAmount > MAX_USDT) {
        setSnapshot({
          key: requestKey,
          chain,
          currency,
          quote: null,
          fx: liveFx,
          status: "error",
          error: `Amount must be at most ${MAX_USDT.toLocaleString()} USDT.`,
          fundsError: "",
        });
        return;
      }

      const fundsError =
        quoted.data.available === false
          ? (quoted.data.availableReason ??
            "This amount is currently unavailable.")
          : "";

      setSnapshot({
        key: requestKey,
        chain,
        currency,
        quote: quoted.data,
        fx: {
          rate: quoted.data.rate,
          feePercent: quoted.data.feePercent,
          currency: quoted.data.currency,
          fees: feesFromQuote(quoted.data),
        },
        status: "ready",
        error: "",
        fundsError,
      });
    }, delay);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    requestKey,
    chain,
    country,
    provider,
    currency,
    entry,
    localPayout,
    usdtSell,
    activeAmount,
  ]);

  const stale = snapshot.key !== requestKey;
  const fx =
    snapshot.chain === chain && snapshot.currency === currency
      ? snapshot.fx
      : null;

  return {
    quote: stale ? null : snapshot.quote,
    fx,
    status: stale ? "loading" : snapshot.status,
    error: stale ? "" : snapshot.error,
    fundsError: stale ? "" : snapshot.fundsError,
  };
}
