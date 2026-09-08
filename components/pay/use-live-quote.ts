"use client";

import { useEffect, useState } from "react";
import { isAborted, requestQuote } from "@/lib/pay-api";
import { usdtForTargetLocal } from "@/lib/settlement/quote";
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
};

type Snapshot = {
  key: string;
  chain: ChainId;
  currency: string;
  quote: Quote | null;
  fx: LiveFx | null;
  status: QuoteStatus;
  error: string;
};

export function useLiveQuote(input: {
  chain: ChainId;
  currency: string;
  entry: AmountEntry | LegacyAmountEntry;
  localPayout: number;
  usdtSell: number;
  /** @deprecated use localPayout */
  rwfPayout?: number;
}) {
  const currency = input.currency.trim().toUpperCase() || "RWF";
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
  const requestKey = `${chain}:${currency}:${entry}:${activeAmount}`;
  const [snapshot, setSnapshot] = useState<Snapshot>({
    key: "",
    chain,
    currency,
    quote: null,
    fx: null,
    status: "idle",
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    const delay = activeAmount > 0 ? QUOTE_DEBOUNCE_MS : 0;

    const timer = window.setTimeout(async () => {
      const probe = await requestQuote(
        QUOTE_PROBE_USDT,
        chain,
        controller.signal,
        currency,
      );
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
        });
        return;
      }

      const liveFx = {
        rate: probe.data.rate,
        feePercent: probe.data.feePercent,
        currency: probe.data.currency,
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
        });
        return;
      }

      let usdt = usdtSell;
      if (entry === "local") {
        const derived = usdtForTargetLocal(
          localPayout,
          liveFx.rate,
          liveFx.feePercent,
        );
        if (derived == null) {
          return;
        }
        usdt = derived;
      }

      const quoted = await requestQuote(
        usdt,
        chain,
        controller.signal,
        currency,
      );
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
        });
        return;
      }

      setSnapshot({
        key: requestKey,
        chain,
        currency,
        quote: quoted.data,
        fx: {
          rate: quoted.data.rate,
          feePercent: quoted.data.feePercent,
          currency: quoted.data.currency,
        },
        status: "ready",
        error: "",
      });
    }, delay);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [requestKey, chain, currency, entry, localPayout, usdtSell, activeAmount]);

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
  };
}
