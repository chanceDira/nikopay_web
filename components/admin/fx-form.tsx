"use client";

import { useEffect, useState } from "react";

type RateRow = {
  rate: number;
  feePercent: number;
  minUsdt: number;
  effectiveFrom: string;
  createdAt: string;
};

type FormState = "idle" | "saving" | "success" | "error";

const HEADERS = { "Content-Type": "application/json", "x-admin-session": "true" };

export function AdminFxForm() {
  const [history, setHistory] = useState<RateRow[]>([]);
  const [rate, setRate] = useState(1350);
  const [feePercent, setFeePercent] = useState(1.5);
  const [minUsdt, setMinUsdt] = useState(10);
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const loadHistory = async () => {
    const res = await fetch("/api/admin/fx", { headers: { "x-admin-session": "true" } });
    if (!res.ok) return;
    const json = (await res.json()) as { data: RateRow[] };
    const rows = json.data ?? [];
    setHistory(rows);
    if (rows.length > 0) {
      setRate(rows[0].rate);
      setFeePercent(rows[0].feePercent);
      setMinUsdt(rows[0].minUsdt);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadHistory(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setFormState("saving");

    const res = await fetch("/api/admin/fx", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ rate, feePercent, minUsdt }),
    });

    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setErrorMsg(json.error ?? "Failed to save.");
      setFormState("error");
      return;
    }

    setFormState("success");
    void loadHistory();
    setTimeout(() => setFormState("idle"), 3000);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md h-fit">
        <h4 className="text-sm font-semibold font-mono uppercase tracking-wider text-niko-teal mb-4">
          Update parameters
        </h4>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              USDT to RWF base rate
            </label>
            <div className="relative rounded-md border border-niko-border bg-background px-3 py-2 focus-within:border-niko-teal/50 transition-colors">
              <input
                type="number"
                step="any"
                required
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-mono text-sm text-foreground outline-none"
              />
              <span className="absolute right-3 top-2.5 font-mono text-xs text-niko-muted font-bold">
                RWF
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Service fee percent
            </label>
            <div className="relative rounded-md border border-niko-border bg-background px-3 py-2 focus-within:border-niko-teal/50 transition-colors">
              <input
                type="number"
                step="any"
                required
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
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Min USDT deposit
            </label>
            <div className="relative rounded-md border border-niko-border bg-background px-3 py-2 focus-within:border-niko-teal/50 transition-colors">
              <input
                type="number"
                step="any"
                required
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
              Rate updated and live.
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
              "Apply config"
            )}
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
        <h4 className="text-sm font-semibold font-mono uppercase tracking-wider text-niko-teal mb-4">
          Rate adjustment log
        </h4>

        <div className="overflow-x-auto rounded border border-niko-border/20 bg-background/50">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-niko-border/30 bg-niko-surface/20 font-mono uppercase text-niko-muted">
                <th className="px-4 py-3">Effective from</th>
                <th className="px-4 py-3">Base rate</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Min USDT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-niko-border/10 font-mono text-foreground">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-niko-muted font-sans text-xs">
                    No rates configured yet.
                  </td>
                </tr>
              ) : (
                history.map((row, idx) => (
                  <tr key={idx} className="hover:bg-niko-surface/10 transition-colors">
                    <td className="px-4 py-3 text-foreground/80 font-sans">
                      {formatDate(row.effectiveFrom)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      1 USDT = {row.rate} RWF
                    </td>
                    <td className="px-4 py-3 font-semibold text-niko-teal-bright">
                      {row.feePercent}%
                    </td>
                    <td className="px-4 py-3">{row.minUsdt} USDT</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
