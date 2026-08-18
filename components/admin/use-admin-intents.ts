"use client";

import { useCallback, useEffect, useState } from "react";
import type { PaymentIntent } from "@/lib/settlement/types";

const POLL_MS = 8000;

export function useAdminIntents() {
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/intents");
      if (!res.ok) {
        return;
      }
      const json = (await res.json()) as { data: PaymentIntent[] };
      setIntents(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (cancelled) {
        return;
      }
      await reload();
    };

    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [reload]);

  return { intents, loading, reload };
}
