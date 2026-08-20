"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  isMomoPayoutStatus,
  type AdminPayout,
  type MomoPayoutStatus,
} from "@/lib/admin-payouts";
import { paginate } from "@/lib/paginate";
import { formatRwf } from "@/lib/rates";

const PAGE_SIZE = 10;
const POLL_MS = 8000;

const FILTERS: { value: "all" | MomoPayoutStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "successful", label: "Reached user" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "timeout", label: "Timeout" },
];

export function AdminPayoutsTable() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("status");
  const statusFilter: "all" | MomoPayoutStatus = isMomoPayoutStatus(requested)
    ? requested
    : "all";

  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/admin/payouts");
        if (!cancelled && res.ok) {
          const json = (await res.json()) as { data: AdminPayout[] };
          setPayouts(json.data ?? []);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const filtered =
    statusFilter === "all"
      ? payouts
      : payouts.filter((row) => row.status === statusFilter);
  const paged = paginate(filtered, page, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const href =
            filter.value === "all"
              ? "/admin/payouts"
              : `/admin/payouts?status=${filter.value}`;
          const active = statusFilter === filter.value;
          return (
            <Link
              key={filter.value}
              href={href}
              onClick={() => setPage(1)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                active
                  ? "bg-niko-teal/15 text-niko-teal border-niko-teal/30"
                  : "border-niko-border text-niko-muted hover:border-niko-teal/40"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-niko-border/30 bg-niko-surface/20 text-xs font-mono uppercase tracking-wider text-niko-muted">
                <th className="px-6 py-4">Sent</th>
                <th className="px-6 py-4">Recipient</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">MoMo status</th>
                <th className="px-6 py-4">Provider ref</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4 text-right">Intent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-niko-border/10 text-sm">
              {loading && filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-niko-muted"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-niko-muted"
                  >
                    No MoMo transfers yet. Run payouts after a deposit is
                    credited.
                  </td>
                </tr>
              ) : (
                paged.items.map((row) => (
                  <tr key={row.id} className="hover:bg-niko-surface/10">
                    <td className="px-6 py-4 text-foreground/80 font-sans text-xs">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-6 py-4 font-mono text-foreground">
                      {row.msisdn}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-niko-teal-bright">
                      {formatRwf(row.amountRwf)}
                    </td>
                    <td className="px-6 py-4">{statusBadge(row.status)}</td>
                    <td className="px-6 py-4 font-mono text-xs text-foreground">
                      {row.providerRef ?? "—"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-niko-muted max-w-[14rem] truncate" title={row.providerReason ?? undefined}>
                      {row.providerReason ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/transactions/${row.intentId}`}
                        className="font-mono text-xs text-niko-teal hover:underline"
                      >
                        {row.intentId.slice(0, 8)}...
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-mono text-niko-muted">
            Page {paged.page} of {paged.totalPages} ({paged.total} transfers)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={paged.page <= 1}
              onClick={() => setPage(paged.page - 1)}
              className="px-3 py-1.5 border border-niko-border text-xs font-semibold rounded-md text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-niko-surface/50 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={paged.page >= paged.totalPages}
              onClick={() => setPage(paged.page + 1)}
              className="px-3 py-1.5 border border-niko-border text-xs font-semibold rounded-md text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-niko-surface/50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function statusBadge(status: MomoPayoutStatus) {
  const styles: Record<MomoPayoutStatus, string> = {
    successful: "bg-niko-teal/15 text-niko-teal border-niko-teal/20",
    pending: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    timeout: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  const labels: Record<MomoPayoutStatus, string> = {
    successful: "Reached user",
    pending: "Pending",
    failed: "Failed",
    timeout: "Timeout",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
