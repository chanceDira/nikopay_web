"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchLiveIntentsByWallet, isAborted } from "@/lib/pay-api";
import type { PaymentIntentSummary } from "@/lib/settlement/types";
import { formatLocalAmount, formatUsdt } from "@/lib/rates";
import { paginate } from "@/lib/paginate";
import { PageHeader } from "@/components/shared/page-header";
import {
  PaginationControls,
  TABLE_PAGE_SIZE,
} from "@/components/shared/pagination-controls";
import { useWalletSession } from "@/components/pay/use-wallet-session";

const HISTORY_POLL_MS = 2000;

export default function PaymentsHistoryPage() {
  const { walletAddress, hydrated } = useWalletSession();
  const [intents, setIntents] = useState<PaymentIntentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!hydrated || !walletAddress) {
      return;
    }

    let cancelled = false;
    const loadLive = async () => {
      const result = await fetchLiveIntentsByWallet(walletAddress);
      if (cancelled || isAborted(result)) {
        return;
      }
      if (result.ok) {
        setIntents(result.data);
      }
      setLoading(false);
    };

    void loadLive();
    const interval = window.setInterval(() => {
      void loadLive();
    }, HISTORY_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hydrated, walletAddress]);

  const visibleIntents = walletAddress ? intents : [];
  const visibleLoading = !hydrated || (Boolean(walletAddress) && loading);
  const paged = paginate(visibleIntents, page, TABLE_PAGE_SIZE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-niko-teal/15 text-niko-teal border border-niko-teal/20">
            Paid
          </span>
        );
      case "awaiting_payment":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-[#fffbeb] dark:bg-yellow-400/10 text-[#92400e] dark:text-yellow-400 border border-amber-200/60 dark:border-yellow-400/20 animate-pulse">
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
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-[#fffbeb] dark:bg-amber-500/10 text-[#92400e] dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/20">
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

  return (
    <PageHeader
      title="Payment history"
      description="Track and review your recent USDT to Mobile Money payments."
    >
      {visibleLoading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-niko-teal border-t-transparent" />
          <p className="text-xs text-niko-muted font-medium">
            Loading history...
          </p>
        </div>
      ) : visibleIntents.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-niko-teal/5 border border-niko-teal/10">
            <svg
              className="h-6 w-6 text-niko-teal"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-base font-bold text-foreground">
            No payments found
          </h3>
          <p className="text-xs text-niko-muted max-w-xs mx-auto">
            You haven&apos;t created any payment intents yet. Start your first
            transaction now.
          </p>
          <Link
            href="/app/pay"
            className="inline-block px-4 py-2 bg-niko-teal hover:bg-niko-teal-bright text-niko-on-accent font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(0,212,200,0.1)]"
          >
            Create New Payment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-niko-border/60 text-xs font-semibold uppercase tracking-wider text-niko-muted">
                  <th className="px-4 py-3 sm:px-6">Date</th>
                  <th className="px-4 py-3 sm:px-6">ID</th>
                  <th className="px-4 py-3 sm:px-6">Network</th>
                  <th className="px-4 py-3 sm:px-6">Send Amount</th>
                  <th className="px-4 py-3 sm:px-6">Payout</th>
                  <th className="px-4 py-3 sm:px-6">Status</th>
                  <th className="px-4 py-3 text-right sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-niko-border/30 text-sm">
                {paged.items.map((intent) => {
                  const date = new Date(intent.createdAt).toLocaleDateString(
                    "en-RW",
                    {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  );
                  return (
                    <tr
                      key={intent.id}
                      className="transition-colors hover:bg-niko-surface/20"
                    >
                      <td className="px-4 py-4 font-medium text-niko-muted sm:px-6">
                        {date}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs font-bold text-foreground sm:px-6">
                        {intent.id}
                      </td>
                      <td className="px-4 py-4 font-medium capitalize text-foreground sm:px-6">
                        {intent.chain}
                      </td>
                      <td className="px-4 py-4 font-mono font-semibold text-foreground sm:px-6">
                        {formatUsdt(intent.usdtAmount)}
                      </td>
                      <td className="space-y-0.5 px-4 py-4 sm:px-6">
                        <p className="font-mono font-bold text-foreground">
                          {formatLocalAmount(intent.netRwf, intent.currency)}
                        </p>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        {getStatusBadge(intent.status)}
                      </td>
                      <td className="space-x-3 px-4 py-4 text-right sm:px-6">
                        <Link
                          href={`/app/payments/${intent.id}`}
                          className="text-xs font-semibold text-niko-teal transition-colors hover:text-niko-teal-bright hover:underline"
                        >
                          Track
                        </Link>
                        {intent.status === "paid" && (
                          <Link
                            href={`/app/payments/${intent.id}/receipt`}
                            className="text-xs font-semibold text-niko-muted transition-colors hover:text-foreground hover:underline"
                          >
                            Receipt
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={paged.page}
            totalPages={paged.totalPages}
            total={paged.total}
            label="payments"
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => current + 1)}
          />
        </div>
      )}
    </PageHeader>
  );
}
