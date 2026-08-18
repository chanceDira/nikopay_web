"use client";

import { useEffect, useState } from "react";
import type { PaymentIntent } from "@/lib/settlement/types";

const POLL_MS = 8000;

export function useAdminIntents() {
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/admin/intents");
        if (!cancelled && res.ok) {
          const json = (await res.json()) as { data: PaymentIntent[] };
          setIntents(json.data ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return { intents, loading };
}
