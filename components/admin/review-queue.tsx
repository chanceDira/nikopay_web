"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminIntents } from "@/components/admin/use-admin-intents";
import type { PaymentIntent, PaymentStatus } from "@/lib/settlement/types";

const REVIEW_STATUSES: PaymentStatus[] = [
  "awaiting_payment",
  "detected",
  "manual_review",
  "credited",
  "payout_pending",
];

const PATCH_HEADERS = {
  "x-admin-session": "true",
  "Content-Type": "application/json",
};

export function AdminReviewQueue() {
  const { intents, loading } = useAdminIntents();
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const queue = intents.filter((i) => REVIEW_STATUSES.includes(i.status));

  const patchStatus = async (intent: PaymentIntent, status: PaymentStatus) => {
    setSuccessMsg("");
    setErrorMsg("");

    const res = await fetch(`/api/admin/intents/${intent.id}`, {
      method: "PATCH",
      headers: PATCH_HEADERS,
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setErrorMsg(json.error ?? "Update failed.");
      return;
    }

    setSuccessMsg(`${intent.id.slice(0, 8)}... moved to ${status.replace(/_/g, " ")}.`);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatRwf = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "RWF",
      maximumFractionDigits: 0,
    })
      .format(val)
      .replace("RWF", "RWF ");

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-3 rounded-md bg-niko-teal/15 border border-niko-teal/20 text-niko-teal text-xs text-center">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
          {errorMsg}
        </div>
      )}

      <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
        <h4 className="text-sm font-semibold font-mono uppercase tracking-wider text-niko-teal mb-4">
          Pending operations queue ({loading ? "..." : queue.length})
        </h4>

        {loading && queue.length === 0 ? (
          <div className="flex justify-center py-10">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-niko-teal border-t-transparent" />
          </div>
        ) : queue.length === 0 ? (
          <p className="text-sm text-niko-muted py-8 text-center font-sans">
            Queue is empty. All payments are settled or closed.
          </p>
        ) : (
          <div className="space-y-4">
            {queue.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-md border border-niko-border/20 bg-background/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-niko-border/40 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-niko-teal">
                      <Link href={`/admin/transactions/${item.id}`} className="hover:underline">
                        {item.id}
                      </Link>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize border ${
                        item.status === "manual_review"
                          ? "bg-[var(--niko-warning-bg)] text-[var(--niko-warning-text)] border-[var(--niko-warning-border)]"
                          : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      }`}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-niko-muted font-mono capitalize">{item.chain}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs font-mono">
                    <div>
                      <span className="text-niko-muted block">USDT</span>
                      <span className="text-foreground font-semibold">{item.usdtAmount.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-niko-muted block">Payout (net)</span>
                      <span className="text-niko-teal-bright font-semibold">{formatRwf(item.netRwf)}</span>
                    </div>
                    <div>
                      <span className="text-niko-muted block">Recipient</span>
                      <span className="text-foreground">{item.msisdn}</span>
                    </div>
                    <div>
                      <span className="text-niko-muted block">Created</span>
                      <span className="text-foreground/80 font-sans">{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  {item.status === "manual_review" ? (
                    <button
                      type="button"
                      onClick={() => void patchStatus(item, "credited")}
                      className="flex-1 md:flex-none px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-md transition-all cursor-pointer"
                    >
                      Release transfer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void patchStatus(item, "paid")}
                      className="flex-1 md:flex-none px-4 py-2 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy text-xs font-bold rounded-md transition-all cursor-pointer"
                    >
                      Confirm funds
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void patchStatus(item, "failed")}
                    className="px-3 py-2 border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-semibold rounded-md transition-all cursor-pointer"
                  >
                    Fail
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
