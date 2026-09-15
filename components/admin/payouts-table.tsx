"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  isAdminPayoutStatus,
  type AdminPayout,
  type AdminPayoutStatus,
} from "@/lib/admin-payouts";
import { paginate } from "@/lib/paginate";
import { formatRwf } from "@/lib/rates";

const PAGE_SIZE = 10;
const POLL_MS = 8000;

const FILTERS: { value: "all" | AdminPayoutStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "successful", label: "Reached user" },
  { value: "pending", label: "Pending" },
  { value: "enqueued", label: "Enqueued" },
  { value: "failed", label: "Failed" },
];

export function AdminPayoutsTable() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("status");
  const statusFilter: "all" | AdminPayoutStatus = isAdminPayoutStatus(requested)
    ? requested
    : "all";

  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const reload = async () => {
    const res = await fetch("/api/admin/payouts");
    if (res.ok) {
      const json = (await res.json()) as { data: AdminPayout[] };
      setPayouts(json.data ?? []);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        await reload();
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

  const cancelEnqueued = async (payoutId: string) => {
    setActionError("");
    setCancelId(payoutId);
    const res = await fetch(`/api/admin/payouts/${payoutId}/fail-enqueued`, {
      method: "POST",
    });
    const json = (await res.json()) as { error?: string };
    setCancelId(null);
    if (!res.ok) {
      setActionError(json.error ?? "Unable to cancel enqueued payout.");
      return;
    }
    await reload();
  };

  return (
    <div className="space-y-4">
      {actionError ? (
        <p className="text-xs text-red-400">{actionError}</p>
      ) : null}
      <div className="niko-panel flex flex-wrap gap-2 p-3">
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
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-niko-teal/35 bg-niko-teal/15 text-niko-teal"
                  : "border-transparent text-niko-muted hover:border-niko-border hover:bg-niko-well/60 hover:text-foreground"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="niko-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-niko-border/40 bg-niko-well/50 text-xs text-niko-muted">
                <th className="px-5 py-3.5 font-medium sm:px-6">Sent</th>
                <th className="px-5 py-3.5 font-medium sm:px-6">Corridor</th>
                <th className="px-5 py-3.5 font-medium sm:px-6">Recipient</th>
                <th className="px-5 py-3.5 text-right font-medium sm:px-6">
                  Amount
                </th>
                <th className="px-5 py-3.5 font-medium sm:px-6">Status</th>
                <th className="px-5 py-3.5 font-medium sm:px-6">
                  Provider ref
                </th>
                <th className="px-5 py-3.5 font-medium sm:px-6">Reason</th>
                <th className="px-5 py-3.5 text-right font-medium sm:px-6">
                  Intent
                </th>
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
                    No payouts yet.
                  </td>
                </tr>
              ) : (
                paged.items.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-niko-well/40"
                  >
                    <td className="px-5 py-4 text-xs text-foreground/80 sm:px-6">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-foreground sm:px-6">
                      {row.country}
                      {row.provider ? ` · ${row.provider}` : ""}
                    </td>
                    <td className="px-5 py-4 font-mono text-foreground sm:px-6">
                      {row.msisdn}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold tabular-nums text-niko-teal-bright sm:px-6">
                      {row.currency === "RWF"
                        ? formatRwf(row.amountRwf)
                        : `${row.amountRwf} ${row.currency}`}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      {statusBadge(row.status)}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-foreground sm:px-6">
                      {row.providerRef ?? "—"}
                    </td>
                    <td
                      className="max-w-[14rem] truncate px-5 py-4 font-mono text-xs text-niko-muted sm:px-6"
                      title={row.providerReason ?? undefined}
                    >
                      {row.providerReason ?? "—"}
                    </td>
                    <td className="space-y-1 px-5 py-4 text-right sm:px-6">
                      {row.intentId ? (
                        <Link
                          href={`/admin/transactions/${row.intentId}`}
                          className="font-mono text-xs text-niko-teal hover:underline"
                        >
                          {row.intentId.slice(0, 8)}...
                        </Link>
                      ) : (
                        <span className="font-mono text-xs text-niko-muted">
                          bulk
                        </span>
                      )}
                      {row.rail === "pawapay" && row.status === "enqueued" ? (
                        <div>
                          <button
                            type="button"
                            disabled={cancelId === row.referenceId}
                            onClick={() => void cancelEnqueued(row.referenceId)}
                            className="font-mono text-[11px] text-violet-300 hover:underline disabled:opacity-50 cursor-pointer"
                          >
                            {cancelId === row.referenceId
                              ? "cancelling…"
                              : "cancel enqueued"}
                          </button>
                        </div>
                      ) : null}
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

function statusBadge(status: AdminPayoutStatus) {
  const styles: Record<AdminPayoutStatus, string> = {
    successful: "bg-niko-teal/15 text-niko-teal border-niko-teal/20",
    pending: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    enqueued: "bg-violet-400/10 text-violet-300 border-violet-400/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const labels: Record<AdminPayoutStatus, string> = {
    successful: "Reached user",
    pending: "Pending",
    enqueued: "Enqueued",
    failed: "Failed",
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
