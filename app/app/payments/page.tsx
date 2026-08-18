"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getMockIntents, updateActiveIntentStatuses } from "@/lib/fixtures";
import { fetchLiveIntentsByWallet, isAborted } from "@/lib/pay-api";
import type { PaymentIntent } from "@/lib/settlement/types";
import { formatRwf, formatUsdt } from "@/lib/rates";
import { PageHeader } from "@/components/shared/page-header";
import { readStoredWalletAddress } from "@/lib/wallet-session";

const HISTORY_POLL_MS = 2000;

export default function PaymentsHistoryPage() {
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wallet = readStoredWalletAddress();

    if (!wallet) {
      const loadFixtures = () => {
        updateActiveIntentStatuses();
        setIntents(getMockIntents());
        setLoading(false);
      };

      loadFixtures();
      const interval = window.setInterval(loadFixtures, HISTORY_POLL_MS);
      return () => window.clearInterval(interval);
    }

    let cancelled = false;
    const loadLive = async () => {
      const result = await fetchLiveIntentsByWallet(wallet);
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
  }, []);

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

  return (
    <PageHeader
      title="Payment history"
      description="Track and review your recent USDT to Mobile Money payments."
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-niko-teal border-t-transparent" />
          <p className="text-xs text-niko-muted font-medium">
            Loading history...
          </p>
        </div>
      ) : intents.length === 0 ? (
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
            className="inline-block px-4 py-2 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(0,212,200,0.1)]"
          >
            Create New Payment
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 sm:mx-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-niko-border/60 text-xs font-semibold uppercase tracking-wider text-niko-muted">
                <th className="px-4 py-3 sm:px-6">Date</th>
                <th className="px-4 py-3 sm:px-6">ID</th>
                <th className="px-4 py-3 sm:px-6">Network</th>
                <th className="px-4 py-3 sm:px-6">Send Amount</th>
                <th className="px-4 py-3 sm:px-6">Recipient (RWF)</th>
                <th className="px-4 py-3 sm:px-6">Status</th>
                <th className="px-4 py-3 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-niko-border/30 text-sm">
              {intents.map((intent) => {
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
                    className="hover:bg-niko-surface/20 transition-colors"
                  >
                    <td className="px-4 py-4 sm:px-6 text-niko-muted font-medium">
                      {date}
                    </td>
                    <td className="px-4 py-4 sm:px-6 font-mono text-xs text-foreground font-bold">
                      {intent.id}
                    </td>
                    <td className="px-4 py-4 sm:px-6 capitalize text-foreground font-medium">
                      {intent.chain}
                    </td>
                    <td className="px-4 py-4 sm:px-6 font-mono text-foreground font-semibold">
                      {formatUsdt(intent.usdtAmount)}
                    </td>
                    <td className="px-4 py-4 sm:px-6 space-y-0.5">
                      <p className="font-mono text-foreground font-bold">
                        {formatRwf(intent.netRwf)}
                      </p>
                      <p className="text-[10px] text-niko-muted font-mono">
                        {intent.msisdn}
                      </p>
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      {getStatusBadge(intent.status)}
                    </td>
                    <td className="px-4 py-4 sm:px-6 text-right space-x-3">
                      <Link
                        href={`/app/payments/${intent.id}`}
                        className="text-xs font-semibold text-niko-teal hover:text-niko-teal-bright hover:underline transition-colors"
                      >
                        Track
                      </Link>
                      {intent.status === "paid" && (
                        <Link
                          href={`/app/payments/${intent.id}/receipt`}
                          className="text-xs font-semibold text-niko-muted hover:text-foreground hover:underline transition-colors"
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
      )}
    </PageHeader>
  );
}
