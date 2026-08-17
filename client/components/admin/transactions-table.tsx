"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMockIntents } from "@/lib/fixtures";
import type { PaymentIntent, PaymentStatus } from "@/lib/settlement/types";

export function AdminTransactionsTable() {
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    setIntents(getMockIntents());
  }, []);

  // Filter list
  const filtered = intents.filter((intent) => {
    const matchesSearch =
      intent.id.toLowerCase().includes(search.toLowerCase()) ||
      intent.msisdn.includes(search);

    const matchesStatus =
      statusFilter === "all" || intent.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
            Manual Review
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
      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[var(--niko-card-bg)] backdrop-blur-md border border-niko-border/40 p-4 rounded-md">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search by ID or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-niko-border text-foreground px-4 py-2 text-sm rounded-md outline-none focus:border-niko-teal/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs text-niko-muted font-mono uppercase">
            Filter:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-niko-border text-foreground px-3 py-2 text-sm rounded-md outline-none focus:border-niko-teal/50 transition-colors cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="awaiting_payment">Awaiting</option>
            <option value="detected">Detected</option>
            <option value="credited">Credited</option>
            <option value="manual_review">Manual Review</option>
            <option value="payout_pending">Payout Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Transactions Table Container */}
      <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-niko-border/30 bg-niko-surface/20 text-xs font-mono uppercase tracking-wider text-niko-muted">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Recipient</th>
                <th className="px-6 py-4">USDT Sent</th>
                <th className="px-6 py-4">RWF Payout</th>
                <th className="px-6 py-4">Network</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-niko-border/10 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-niko-muted font-sans"
                  >
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((intent) => (
                  <tr
                    key={intent.id}
                    className="hover:bg-niko-surface/10 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-niko-teal">
                      <Link
                        href={`/admin/transactions/${intent.id}`}
                        className="hover:underline"
                      >
                        {intent.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-foreground/80 font-sans">
                      {formatDate(intent.createdAt)}
                    </td>
                    <td className="px-6 py-4 font-mono text-foreground">
                      {intent.msisdn}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-foreground">
                      {intent.usdtAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-niko-teal-bright">
                      {formatRwf(intent.netRwf)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-foreground/80 font-mono capitalize">
                        <span
                          className={`h-2 w-2 rounded-full ${intent.chain === "polygon" ? "bg-indigo-500" : "bg-sky-400"}`}
                        />
                        {intent.chain}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {getStatusBadge(intent.status)}
                    </td>
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
