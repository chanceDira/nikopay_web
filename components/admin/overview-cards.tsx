"use client";

import { useAdminIntents } from "@/components/admin/use-admin-intents";
import { summarizeAdminIntents } from "@/lib/admin-metrics";
import { formatRwf, formatUsdt } from "@/lib/rates";
import type { PaymentStatus } from "@/lib/settlement/types";

const STATUS_BARS: {
  status: PaymentStatus;
  label: string;
  color: string;
}[] = [
  { status: "awaiting_payment", label: "Awaiting", color: "bg-yellow-500/80" },
  { status: "detected", label: "Detected", color: "bg-sky-500/80" },
  { status: "credited", label: "Credited", color: "bg-indigo-500/80" },
  { status: "manual_review", label: "Review", color: "bg-amber-600/80" },
  { status: "payout_pending", label: "Pending", color: "bg-blue-500/80" },
  { status: "paid", label: "Paid", color: "bg-niko-teal/80" },
  { status: "failed", label: "Failed", color: "bg-red-500/80" },
  { status: "expired", label: "Expired", color: "bg-zinc-500/80" },
];

export function AdminOverviewCards() {
  const { intents, loading } = useAdminIntents();

  if (loading && intents.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-niko-muted text-sm font-mono">
        Loading...
      </div>
    );
  }

  const metrics = summarizeAdminIntents(intents);
  const polygonUsdt = metrics.matchedUsdtByChain.polygon;
  const baseUsdt = metrics.matchedUsdtByChain.base;
  const maxStatusCount = Math.max(
    ...STATUS_BARS.map((bar) => metrics.statusCounts[bar.status]),
    0,
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md transition-all hover:border-niko-teal/30 hover:translate-y-[-2px] duration-300">
          <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
            USDT received
          </p>
          <h3 className="text-2xl font-bold font-mono text-foreground mt-2">
            {formatUsdt(metrics.matchedUsdt)}
          </h3>
          <div className="mt-3 flex items-center justify-between text-xs text-niko-muted font-sans border-t border-niko-border/20 pt-3">
            <span>Polygon: {formatUsdt(polygonUsdt)}</span>
            <span>Base: {formatUsdt(baseUsdt)}</span>
          </div>
        </div>

        <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md transition-all hover:border-niko-teal/30 hover:translate-y-[-2px] duration-300">
          <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
            RWF disbursed (paid)
          </p>
          <h3 className="text-2xl font-bold font-mono text-foreground mt-2">
            {formatRwf(metrics.paidRwf)}
          </h3>
          <div className="mt-3 flex items-center justify-between text-xs text-niko-muted font-sans border-t border-niko-border/20 pt-3">
            <span>Paid payouts</span>
            <span className="font-semibold text-niko-teal">
              {metrics.paidCount} transactions
            </span>
          </div>
        </div>

        <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md transition-all hover:border-niko-teal/30 hover:translate-y-[-2px] duration-300">
          <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
            NikoPay revenue (fees)
          </p>
          <h3 className="text-2xl font-bold font-mono text-foreground mt-2">
            {formatRwf(metrics.paidFeesRwf)}
          </h3>
          <div className="mt-3 flex items-center justify-between text-xs text-niko-muted font-sans border-t border-niko-border/20 pt-3">
            {metrics.averageFeePercent === null ||
            metrics.averageFeeRwf === null ? (
              <span>No paid payouts yet</span>
            ) : (
              <>
                <span>Average fee ({metrics.averageFeePercent}%)</span>
                <span className="text-emerald-500 font-semibold">
                  +{formatRwf(metrics.averageFeeRwf)}/tx
                </span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md transition-all hover:border-niko-teal/30 hover:translate-y-[-2px] duration-300">
          <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
            Disbursement success
          </p>
          <h3 className="text-2xl font-bold font-mono text-foreground mt-2">
            {metrics.successRate === null ? "—" : `${metrics.successRate}%`}
          </h3>
          <div className="mt-3 flex items-center justify-between text-xs text-niko-muted font-sans border-t border-niko-border/20 pt-3">
            <span>
              {metrics.paidCount} paid / {metrics.failedCount} failed
            </span>
            <span className="font-semibold text-amber-500">
              {metrics.reviewCount} in review
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
        <h4 className="text-sm font-semibold text-foreground mb-6">
          Volume breakdown and network activity
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <p className="text-xs text-niko-muted">
              Matched USDT deposits by chain
            </p>

            <div className="space-y-3">
              <ChainVolumeBar
                label="Polygon PoS"
                amount={polygonUsdt}
                total={metrics.matchedUsdt}
                barClass="bg-indigo-500"
              />
              <ChainVolumeBar
                label="Base L2"
                amount={baseUsdt}
                total={metrics.matchedUsdt}
                barClass="bg-sky-400"
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-niko-muted">Intent status counts</p>
            <div className="flex gap-2 h-32 items-end pt-4 border-b border-niko-border/30 px-1">
              {STATUS_BARS.map((bar) => {
                const count = metrics.statusCounts[bar.status];
                const heightPercent =
                  maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
                return (
                  <div
                    key={bar.status}
                    className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                  >
                    <span className="text-[10px] font-mono text-foreground">
                      {count}
                    </span>
                    <div
                      className={`w-full rounded-t-sm ${bar.color}`}
                      style={{
                        height:
                          count > 0 ? `${Math.max(heightPercent, 6)}%` : "0%",
                      }}
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

function ChainVolumeBar(props: {
  label: string;
  amount: number;
  total: number;
  barClass: string;
}) {
  const percent =
    props.total > 0 ? Math.round((props.amount / props.total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-xs font-mono text-foreground mb-1">
        <span>{props.label}</span>
        <span>
          {formatUsdt(props.amount)} ({percent}%)
        </span>
      </div>
      <div className="h-3.5 bg-background rounded-full overflow-hidden border border-niko-border/25">
        <div
          className={`h-full ${props.barClass} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
