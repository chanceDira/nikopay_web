"use client";

import { useEffect, useState } from "react";
import { isUuid } from "@/lib/identity";
import { fetchLiveIntent, isAborted, syncLiveIntent } from "@/lib/pay-api";
import { isTerminalStatus } from "@/lib/settlement/intent-status";
import type { PaymentIntent } from "@/lib/settlement/types";

const POLL_MS = 1500;
const SYNC_MS = 8000;
const SYNC_MS_PAYOUT = 3000;

type Snapshot = {
  id: string | undefined;
  intent: PaymentIntent | undefined;
  ready: boolean;
};

export function useIntentView(id: string | undefined, poll = false) {
  const validId = Boolean(id && isUuid(id));
  const [snapshot, setSnapshot] = useState<Snapshot>({
    id: undefined,
    intent: undefined,
    ready: !id,
  });

  useEffect(() => {
    if (!id || !isUuid(id)) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    let interval: number | undefined;
    let syncInterval: number | undefined;

    const clearTimers = () => {
      if (interval) {
        window.clearInterval(interval);
        interval = undefined;
      }
      if (syncInterval) {
        window.clearInterval(syncInterval);
        syncInterval = undefined;
      }
    };

    const load = async () => {
      const result = await fetchLiveIntent(id, controller.signal);
      if (cancelled || isAborted(result)) {
        return undefined;
      }
      if (result.ok) {
        setSnapshot({ id, intent: result.data, ready: true });
        return result.data;
      }
      setSnapshot((current) =>
        current.id === id
          ? { ...current, ready: true }
          : { id, intent: undefined, ready: true },
      );
      return undefined;
    };

    const syncMsFor = (status: PaymentIntent["status"] | undefined) =>
      status === "credited" || status === "payout_pending"
        ? SYNC_MS_PAYOUT
        : SYNC_MS;

    const armSync = (status: PaymentIntent["status"] | undefined) => {
      if (syncInterval) {
        window.clearInterval(syncInterval);
      }
      syncInterval = window.setInterval(syncOnce, syncMsFor(status));
    };

    const syncOnce = () => {
      void syncLiveIntent(id, controller.signal).then((synced) => {
        if (cancelled || isAborted(synced) || !synced.ok) {
          return;
        }
        setSnapshot({ id, intent: synced.data, ready: true });
        if (isTerminalStatus(synced.data.status)) {
          clearTimers();
          return;
        }
        armSync(synced.data.status);
      });
    };

    void load().then((data) => {
      if (cancelled || !poll || (data && isTerminalStatus(data.status))) {
        return;
      }
      syncOnce();
      interval = window.setInterval(() => {
        void load().then((next) => {
          if (next && isTerminalStatus(next.status)) {
            clearTimers();
          }
        });
      }, POLL_MS);
      armSync(data?.status);
    });

    return () => {
      cancelled = true;
      controller.abort();
      clearTimers();
    };
  }, [id, poll]);

  if (!validId) {
    return {
      intent: undefined,
      loading: false,
    };
  }

  const stale = snapshot.id !== id;
  const loading = stale || !snapshot.ready;
  const intent = stale ? undefined : snapshot.intent;

  return { intent, loading };
}
