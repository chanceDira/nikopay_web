"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMockIntents, forceTransition } from "@/lib/fixtures";
import type { PaymentIntent, PaymentStatus } from "@/lib/settlement/types";

export function AdminReviewQueue() {
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [successMsg, setSuccessMsg] = useState("");

  const loadQueue = () => {
    const all = getMockIntents();
    // Only show payments needing active manual actions
    const pending = all.filter((i) =>
      [
        "awaiting_payment",
        "detected",
        "manual_review",
        "credited",
        "payout_pending",
      ].includes(i.status),
    );
    setIntents(pending);
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleAction = (id: string, action: "confirm" | "fail" | "release") => {
    setSuccessMsg("");
    let targetStatus = "paid";
    let message = "";

    if (action === "confirm") {
      targetStatus = "paid";
      message = `Funds confirmed for transaction ${id}. Payout triggered successfully!`;

      // Deduct netRwf from MoMo balance in localStorage to simulate real disbursement payout
      const intent = intents.find((i) => i.id === id);
      if (intent) {
        const storedMomo =
          localStorage.getItem("nikopay_momo_balance") || "4500000";
        const currentMomo = parseInt(storedMomo, 10);
        const newMomo = Math.max(0, currentMomo - intent.netRwf);
        localStorage.setItem("nikopay_momo_balance", newMomo.toString());
      }
    } else if (action === "fail") {
      targetStatus = "failed";
      message = `Transaction ${id} marked as Failed.`;
    } else if (action === "release") {
      targetStatus = "paid";
      message = `Manual override complete. Payment ${id} released!`;

      const intent = intents.find((i) => i.id === id);
      if (intent) {
        const storedMomo =
          localStorage.getItem("nikopay_momo_balance") || "4500000";
        const currentMomo = parseInt(storedMomo, 10);
        const newMomo = Math.max(0, currentMomo - intent.netRwf);
        localStorage.setItem("nikopay_momo_balance", newMomo.toString());
      }
    }

    forceTransition(id, targetStatus as PaymentStatus);
    setSuccessMsg(message);
    loadQueue();

    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRwf = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "RWF",
      maximumFractionDigits: 0,
    })
      .format(val)
      .replace("RWF", "RWF ");
  };

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-3 rounded-md bg-niko-teal/15 border border-niko-teal/20 text-niko-teal text-xs font-sans text-center transition-all">
          {successMsg}
        </div>
      )}

      <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
        <h4 className="text-sm font-semibold text-foreground mb-4 font-mono uppercase tracking-wider text-niko-teal">
          Pending Operations Queue ({intents.length})
        </h4>

        {intents.length === 0 ? (
          <p className="text-sm text-niko-muted py-8 text-center font-sans">
            Operations queue is empty. All payments are settled or closed.
          </p>
        ) : (
          <div className="space-y-4">
            {intents.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-md border border-niko-border/20 bg-background/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-niko-border/40"
              >
                {/* Details layout */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-niko-teal">
                      <Link
                        href={`/admin/transactions/${item.id}`}
                        className="hover:underline"
                      >
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
                      {item.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-niko-muted font-mono capitalize">
                      {item.chain}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs font-mono">
                    <div>
                      <span className="text-niko-muted block">
                        USDT Amount:
                      </span>
                      <span className="text-foreground font-semibold">
                        {item.usdtAmount.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-niko-muted block">Payout Net:</span>
                      <span className="text-niko-teal-bright font-semibold">
                        {formatRwf(item.netRwf)}
                      </span>
                    </div>
                    <div>
                      <span className="text-niko-muted block">
                        Recipient Phone:
                      </span>
                      <span className="text-foreground">{item.msisdn}</span>
                    </div>
                    <div>
                      <span className="text-niko-muted block">Created At:</span>
                      <span className="text-foreground/80 font-sans">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operations buttons */}
                <div className="flex gap-2 w-full md:w-auto">
                  {item.status === "manual_review" ? (
                    <button
                      type="button"
                      onClick={() => handleAction(item.id, "release")}
                      className="flex-1 md:flex-none px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-md transition-all cursor-pointer"
                    >
                      Release Transfer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAction(item.id, "confirm")}
                      className="flex-1 md:flex-none px-4 py-2 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy text-xs font-bold rounded-md transition-all cursor-pointer"
                    >
                      Confirm Funds
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAction(item.id, "fail")}
                    className="px-3 py-2 border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-semibold rounded-md transition-all cursor-pointer"
                  >
                    Fail/Reject
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
