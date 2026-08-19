"use client";

import { useEffect, useState } from "react";
import { isUuid } from "@/lib/identity";
import { fetchLiveIntent, isAborted, syncLiveIntent } from "@/lib/pay-api";
import { isTerminalStatus } from "@/lib/settlement/intent-status";
import type { PaymentIntent } from "@/lib/settlement/types";

const POLL_MS = 1500;
const SYNC_MS = 8000;

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

    const syncOnce = () => {
      void syncLiveIntent(id, controller.signal).then((synced) => {
        if (cancelled || isAborted(synced) || !synced.ok) {
          return;
        }
        setSnapshot({ id, intent: synced.data, ready: true });
        if (isTerminalStatus(synced.data.status)) {
          if (interval) {
            window.clearInterval(interval);
          }
          if (syncInterval) {
            window.clearInterval(syncInterval);
          }
        }
      });
    };

    void load().then((data) => {
      if (cancelled || !poll || (data && isTerminalStatus(data.status))) {
        return;
      }
      syncOnce();
      interval = window.setInterval(() => {
        void load().then((next) => {
          if (next && isTerminalStatus(next.status) && interval) {
            window.clearInterval(interval);
          }
        });
      }, POLL_MS);
      syncInterval = window.setInterval(syncOnce, SYNC_MS);
    });

    return () => {
      cancelled = true;
      controller.abort();
      if (interval) {
        window.clearInterval(interval);
      }
      if (syncInterval) {
        window.clearInterval(syncInterval);
      }
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
