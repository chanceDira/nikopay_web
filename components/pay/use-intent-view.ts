"use client";

import { useEffect, useState } from "react";
import { getMockIntent, updateActiveIntentStatuses } from "@/lib/fixtures";
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
  const live = Boolean(id && isUuid(id));
  const [snapshot, setSnapshot] = useState<Snapshot>({
    id: undefined,
    intent: undefined,
    ready: !id,
  });

  useEffect(() => {
    if (!id) {
      return;
    }

    if (!isUuid(id)) {
      let interval: number | undefined;
      const readFixture = () => {
        updateActiveIntentStatuses();
        const data = getMockIntent(id);
        setSnapshot({ id, intent: data, ready: true });
        return data;
      };

      const timer = window.setTimeout(() => {
        const initial = readFixture();
        if (!poll || (initial && isTerminalStatus(initial.status))) {
          return;
        }
        interval = window.setInterval(() => {
          const data = readFixture();
          if (data && isTerminalStatus(data.status) && interval) {
            window.clearInterval(interval);
          }
        }, POLL_MS);
      }, 0);

      return () => {
        window.clearTimeout(timer);
        if (interval) {
          window.clearInterval(interval);
        }
      };
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

  const stale = snapshot.id !== id;
  const loading = Boolean(id) && (stale || !snapshot.ready);
  const intent = stale ? undefined : snapshot.intent;

  const setIntent = (next: PaymentIntent | undefined) => {
    setSnapshot((current) => ({
      ...current,
      intent: next,
      ready: true,
    }));
  };

  return { intent, setIntent, loading, live };
}
