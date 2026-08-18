"use client";

import { useEffect, useState } from "react";
import { isAborted, requestQuote } from "@/lib/pay-api";
import { usdtForTargetRwf } from "@/lib/settlement/quote";
import type { ChainId, Quote } from "@/lib/settlement/types";

export const QUOTE_PROBE_USDT = 10;
export const QUOTE_DEBOUNCE_MS = 300;

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

export function useLiveQuote(rwfPayout: number, chain: ChainId) {
  const requestKey = `${chain}:${rwfPayout > 0 ? rwfPayout : 0}`;
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
    const delay = rwfPayout > 0 ? QUOTE_DEBOUNCE_MS : 0;

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

      if (rwfPayout <= 0) {
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

      const usdt = usdtForTargetRwf(rwfPayout, liveFx.rate, liveFx.feePercent);
      if (usdt == null) {
        return;
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
  }, [requestKey, chain, rwfPayout]);

  const stale = snapshot.key !== requestKey;
  const fx = snapshot.chain === chain ? snapshot.fx : null;

  return {
    quote: stale ? null : snapshot.quote,
    fx,
    status: stale ? "loading" : snapshot.status,
    error: stale ? "" : snapshot.error,
  };
}
