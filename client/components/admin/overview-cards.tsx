"use client";

import { useEffect, useState } from "react";
import { getMockIntents } from "@/lib/fixtures";
import type { PaymentIntent } from "@/lib/settlement/types";

export function AdminOverviewCards() {
  const [intents, setIntents] = useState<PaymentIntent[]>([]);

  useEffect(() => {
    setIntents(getMockIntents());
  }, []);

  // Filter completed statuses
  const completedIntents = intents.filter((i) =>
    ["paid", "credited", "payout_pending"].includes(i.status),
  );

  // Financial aggregates
  const totalUsdt = completedIntents.reduce((sum, i) => sum + i.usdtAmount, 0);
  const totalRwf = completedIntents.reduce((sum, i) => sum + i.netRwf, 0);
  const totalFees = completedIntents.reduce((sum, i) => sum + i.feeRwf, 0);

  // Success rate
  const finishedIntents = intents.filter((i) =>
    ["paid", "failed", "expired"].includes(i.status),
  );
  const successCount = finishedIntents.filter(
    (i) => i.status === "paid",
  ).length;
  const successRate =
    finishedIntents.length > 0
      ? Math.round((successCount / finishedIntents.length) * 100)
      : 100;

  // Chain breakdown
  const polygonIntents = completedIntents.filter((i) => i.chain === "polygon");
  const baseIntents = completedIntents.filter((i) => i.chain === "base");

  const polygonUsdt = polygonIntents.reduce((sum, i) => sum + i.usdtAmount, 0);
  const baseUsdt = baseIntents.reduce((sum, i) => sum + i.usdtAmount, 0);

  const formatRwf = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "RWF",
      maximumFractionDigits: 0,
    })
      .format(val)
      .replace("RWF", "RWF ");
  };

  const formatUsdt = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    })
      .format(val)
      .replace("$", "$ ");
  };

  return (
    <div className="space-y-8">
      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* USDT Deposits */}
        <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md transition-all hover:border-niko-teal/30 hover:translate-y-[-2px] duration-300">
          <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
            USDT Volume (Gross)
          </p>
          <h3 className="text-2xl font-bold font-mono text-foreground mt-2">
            {formatUsdt(totalUsdt)}
          </h3>
          <div className="mt-3 flex items-center justify-between text-xs text-niko-muted font-sans border-t border-niko-border/20 pt-3">
            <span>Polygon: {formatUsdt(polygonUsdt)}</span>
            <span>Base: {formatUsdt(baseUsdt)}</span>
          </div>
        </div>

        {/* RWF Disbursed */}
        <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md transition-all hover:border-niko-teal/30 hover:translate-y-[-2px] duration-300">
          <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
            RWF Disbursed (Net)
          </p>
          <h3 className="text-2xl font-bold font-mono text-foreground mt-2">
            {formatRwf(totalRwf)}
          </h3>
          <div className="mt-3 flex items-center justify-between text-xs text-niko-muted font-sans border-t border-niko-border/20 pt-3">
            <span>Completed payouts</span>
            <span className="font-semibold text-niko-teal">
              {completedIntents.length} transactions
            </span>
          </div>
        </div>

        {/* Fees Collected */}
        <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md transition-all hover:border-niko-teal/30 hover:translate-y-[-2px] duration-300">
          <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
            NikoPay Revenue (Fees)
          </p>
          <h3 className="text-2xl font-bold font-mono text-foreground mt-2">
            {formatRwf(totalFees)}
          </h3>
          <div className="mt-3 flex items-center justify-between text-xs text-niko-muted font-sans border-t border-niko-border/20 pt-3">
            <span>Average fee (1.5%)</span>
            <span className="text-emerald-500 font-semibold">
              +
              {formatRwf(
                Math.round(totalFees / (completedIntents.length || 1)),
              )}
              /tx
            </span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md transition-all hover:border-niko-teal/30 hover:translate-y-[-2px] duration-300">
          <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
            Disbursement Success
          </p>
          <h3 className="text-2xl font-bold font-mono text-foreground mt-2">
            {successRate}%
          </h3>
          <div className="mt-3 flex items-center justify-between text-xs text-niko-muted font-sans border-t border-niko-border/20 pt-3">
            <span>Awaiting manual check</span>
            <span className="font-semibold text-amber-500">
              {intents.filter((i) => i.status === "manual_review").length}{" "}
              pending
            </span>
          </div>
        </div>
      </div>

      {/* Network Activity Graphic */}
      <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
        <h4 className="text-sm font-semibold text-foreground mb-6">
          Volume Breakdown & Network Activity
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Custom SVG comparison graph */}
          <div className="space-y-4">
            <p className="text-xs text-niko-muted">
              USDT Deposits by Blockchains
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-mono text-foreground mb-1">
                  <span>Polygon PoS</span>
                  <span>
                    {formatUsdt(polygonUsdt)} (
                    {totalUsdt > 0
                      ? Math.round((polygonUsdt / totalUsdt) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-3.5 bg-background rounded-full overflow-hidden border border-niko-border/25">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{
                      width: `${totalUsdt > 0 ? (polygonUsdt / totalUsdt) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-foreground mb-1">
                  <span>Base L2</span>
                  <span>
                    {formatUsdt(baseUsdt)} (
                    {totalUsdt > 0
                      ? Math.round((baseUsdt / totalUsdt) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-3.5 bg-background rounded-full overflow-hidden border border-niko-border/25">
                  <div
                    className="h-full bg-sky-400 transition-all duration-500"
                    style={{
                      width: `${totalUsdt > 0 ? (baseUsdt / totalUsdt) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Simple Operations Activity Bar Representation */}
          <div className="space-y-3">
            <p className="text-xs text-niko-muted">
              Operational State Machine Status Counts
            </p>
            <div className="flex gap-2.5 h-32 items-end pt-4 border-b border-niko-border/30 px-2">
              {[
                {
                  label: "Awaiting",
                  count: intents.filter((i) => i.status === "awaiting_payment")
                    .length,
                  color: "bg-yellow-500/80",
                },
                {
                  label: "Detected",
                  count: intents.filter((i) => i.status === "detected").length,
                  color: "bg-sky-500/80",
                },
                {
                  label: "Credited",
                  count: intents.filter((i) => i.status === "credited").length,
                  color: "bg-indigo-500/80",
                },
                {
                  label: "Review",
                  count: intents.filter((i) => i.status === "manual_review")
                    .length,
                  color: "bg-amber-600/80",
                },
                {
                  label: "Pending",
                  count: intents.filter((i) => i.status === "payout_pending")
                    .length,
                  color: "bg-blue-500/80",
                },
                {
                  label: "Paid",
                  count: intents.filter((i) => i.status === "paid").length,
                  color: "bg-niko-teal/80",
                },
              ].map((bar, idx) => {
                const heightPercent =
                  intents.length > 0
                    ? Math.max((bar.count / intents.length) * 100, 10)
                    : 10;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                  >
                    <span className="text-[10px] font-mono text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {bar.count}
                    </span>
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 hover:brightness-110 ${bar.color}`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[9px] font-mono text-niko-muted tracking-tight truncate max-w-full">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
