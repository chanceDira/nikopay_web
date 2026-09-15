"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminIntents } from "@/components/admin/use-admin-intents";
import {
  PaginationControls,
  TABLE_PAGE_SIZE,
} from "@/components/shared/pagination-controls";
import { formatLocalAmount } from "@/lib/rates";
import { paginate } from "@/lib/paginate";
import {
  formatDurationMicros,
  settlementDurations,
} from "@/lib/settlement/timing";
import type { PaymentStatus } from "@/lib/settlement/types";

export function AdminTransactionsTable() {
  const { intents, loading } = useAdminIntents();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filtered = intents.filter((intent) => {
    const matchesSearch =
      intent.id.toLowerCase().includes(search.toLowerCase()) ||
      intent.msisdn.includes(search);

    const matchesStatus =
      statusFilter === "all" || intent.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const paged = paginate(filtered, page, TABLE_PAGE_SIZE);
  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-niko-teal/15 text-niko-teal border border-niko-teal/20">
            Paid
          </span>
        );
      case "awaiting_payment":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--niko-warning-bg)] text-[var(--niko-warning-text)] border border-[var(--niko-warning-border)] animate-pulse">
            Awaiting
          </span>
        );
      case "detected":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-400/10 text-sky-400 border border-sky-400/20">
            Detected
          </span>
        );
      case "credited":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-400/10 text-indigo-400 border border-indigo-400/20">
            Credited
          </span>
        );
      case "payout_pending":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20 animate-pulse">
            Payout pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            Failed
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-600/10 text-neutral-400 border border-neutral-600/20">
            Expired
          </span>
        );
      case "manual_review":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--niko-warning-bg)] text-[var(--niko-warning-text)] border border-[var(--niko-warning-border)]">
            Manual review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-niko-surface text-niko-muted border border-niko-border">
            {status}
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      <div className="niko-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="ID or phone"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="niko-field w-full rounded-md px-4 py-2.5 text-sm text-foreground outline-none"
          />
        </div>

        <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="niko-field cursor-pointer rounded-md px-3 py-2.5 text-sm text-foreground outline-none"
          >
            <option value="all">All</option>
            <option value="awaiting_payment">Awaiting</option>
            <option value="detected">Detected</option>
            <option value="credited">Credited</option>
            <option value="manual_review">Manual review</option>
            <option value="payout_pending">Payout pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div className="niko-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-niko-border/40 bg-niko-well/50 text-xs text-niko-muted">
                <th className="px-5 py-3.5 font-medium sm:px-6">ID</th>
                <th className="px-5 py-3.5 font-medium sm:px-6">Date</th>
                <th className="px-5 py-3.5 font-medium sm:px-6">Recipient</th>
                <th className="px-5 py-3.5 text-right font-medium sm:px-6">
                  USDT
                </th>
                <th className="px-5 py-3.5 text-right font-medium sm:px-6">
                  Payout
                </th>
                <th className="px-5 py-3.5 font-medium sm:px-6">Network</th>
                <th className="px-5 py-3.5 text-right font-medium sm:px-6">
                  USDT→paid
                </th>
                <th className="px-5 py-3.5 font-medium sm:px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-niko-border/20 text-sm">
              {loading && filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-niko-muted"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-niko-muted"
                  >
                    No transactions found.
                  </td>
                </tr>
              ) : (
                paged.items.map((intent) => (
                  <tr
                    key={intent.id}
                    className="transition-colors hover:bg-niko-well/40"
                  >
                    <td className="px-5 py-4 font-mono text-sm font-semibold text-niko-teal sm:px-6">
                      <Link
                        href={`/admin/transactions/${intent.id}`}
                        className="hover:underline"
                        title={intent.id}
                      >
                        {intent.id}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-foreground/80 sm:px-6">
                      {formatDate(intent.createdAt)}
                    </td>
                    <td className="px-5 py-4 font-mono text-foreground sm:px-6">
                      {intent.msisdn}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold tabular-nums text-foreground sm:px-6">
                      {intent.usdtAmount.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold tabular-nums text-niko-teal-bright sm:px-6">
                      {formatLocalAmount(intent.netRwf, intent.currency)}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs capitalize text-foreground/80">
                        <span
                          className={`h-2 w-2 rounded-full ${intent.chain === "polygon" ? "bg-indigo-500" : "bg-sky-400"}`}
                        />
                        {intent.chain}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-xs tabular-nums text-foreground sm:px-6">
                      {settleDuration(intent)}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      {getStatusBadge(intent.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-niko-border/40 px-5 py-4 sm:px-6">
          <PaginationControls
            page={paged.page}
            totalPages={paged.totalPages}
            total={paged.total}
            label="transactions"
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => current + 1)}
          />
        </div>
      </div>
    </div>
  );
}

function settleDuration(intent: {
  detectedAt?: string;
  creditedAt?: string;
  paidAt?: string;
}): string {
  const micros = settlementDurations({
    detectedAt: intent.detectedAt,
    creditedAt: intent.creditedAt,
    paidAt: intent.paidAt,
  }).usdtToPaidMicros;
  return micros == null ? "-" : formatDurationMicros(micros);
}
