"use client";

import { useEffect, useState } from "react";
import { isAborted, requestQuote } from "@/lib/pay-api";
import { usdtForTargetRwf } from "@/lib/settlement/quote";
import type { ChainId, Quote } from "@/lib/settlement/types";

const QUOTE_PROBE_USDT = 10;
const QUOTE_DEBOUNCE_MS = 300;

export type AmountEntry = "rwf" | "usdt";

type QuoteStatus = "idle" | "loading" | "ready" | "error";

type LiveFx = {
  rate: number;
  feePercent: number;
};

type Snapshot = {
  key: string;
  chain: ChainId;
  quote: Quote | null;
  fx: LiveFx | null;
  status: QuoteStatus;
  error: string;
};

export function useLiveQuote(input: {
  chain: ChainId;
  entry: AmountEntry;
  rwfPayout: number;
  usdtSell: number;
}) {
  const { chain, entry, rwfPayout, usdtSell } = input;
  const activeAmount =
    entry === "rwf"
      ? rwfPayout > 0
        ? rwfPayout
        : 0
      : usdtSell > 0
        ? usdtSell
        : 0;
  const requestKey = `${chain}:${entry}:${activeAmount}`;
  const [snapshot, setSnapshot] = useState<Snapshot>({
    key: "",
    chain,
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
      );
      if (controller.signal.aborted || isAborted(probe)) {
        return;
      }
      if (!probe.ok) {
        setSnapshot({
          key: requestKey,
          chain,
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
      };

      if (activeAmount <= 0) {
        setSnapshot({
          key: requestKey,
          chain,
          quote: null,
          fx: liveFx,
          status: "ready",
          error: "",
        });
        return;
      }

      let usdt = usdtSell;
      if (entry === "rwf") {
        const derived = usdtForTargetRwf(
          rwfPayout,
          liveFx.rate,
          liveFx.feePercent,
        );
        if (derived == null) {
          return;
        }
        usdt = derived;
      }

      const quoted = await requestQuote(usdt, chain, controller.signal);
      if (controller.signal.aborted || isAborted(quoted)) {
        return;
      }
      if (!quoted.ok) {
        setSnapshot({
          key: requestKey,
          chain,
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
        quote: quoted.data,
        fx: {
          rate: quoted.data.rate,
          feePercent: quoted.data.feePercent,
        },
        status: "ready",
        error: "",
      });
    }, delay);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [requestKey, chain, entry, rwfPayout, usdtSell, activeAmount]);

  const stale = snapshot.key !== requestKey;
  const fx = snapshot.chain === chain ? snapshot.fx : null;

  return {
    quote: stale ? null : snapshot.quote,
    fx,
    status: stale ? "loading" : snapshot.status,
    error: stale ? "" : snapshot.error,
  };
}
