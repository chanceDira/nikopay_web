"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminPawapaySnapshot } from "@/lib/admin-pawapay";
import { formatRwf } from "@/lib/rates";
import { paginate } from "@/lib/paginate";
import {
  PaginationControls,
  TABLE_PAGE_SIZE,
} from "@/components/shared/pagination-controls";

export function AdminPawapayDashboard() {
  const [snapshot, setSnapshot] = useState<AdminPawapaySnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [payoutPage, setPayoutPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/pawapay");
        const json = (await res.json()) as {
          data?: AdminPawapaySnapshot;
          error?: string;
        };
        if (cancelled) {
          return;
        }
        if (!res.ok || !json.data) {
          setError(json.error ?? "Unable to load PawaPay status.");
          return;
        }
        setSnapshot(json.data);
        setError("");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !snapshot) {
    return (
      <div className="flex items-center justify-center py-20 text-niko-muted text-sm font-mono">
        Loading...
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <p className="text-sm font-mono text-red-400">
        {error || "Unable to load PawaPay status."}
      </p>
    );
  }

  const paidDebit = snapshot.payouts
    .filter((row) => row.status === "successful")
    .reduce((sum, row) => sum + row.amountRwf, 0);
  const pagedPayouts = paginate(snapshot.payouts, payoutPage, TABLE_PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div className="niko-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
              Environment
            </p>
            <h3 className="text-xl font-bold font-mono text-foreground mt-2 capitalize">
              {snapshot.configured
                ? (snapshot.environment ?? "unknown")
                : "Not configured"}
            </h3>
            <p className="text-xs text-niko-muted mt-1">
              {snapshot.configured
                ? `Callbacks ${snapshot.verifyCallbacks ? "verified" : "not verified"} · ${snapshot.callbackPath}`
                : snapshot.reason}
            </p>
          </div>
          {snapshot.dashboardUrl ? (
            <a
              href={snapshot.dashboardUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-niko-teal border border-niko-teal/30 px-3 py-1.5 rounded-md hover:bg-niko-teal/10"
            >
              Open PawaPay dashboard
            </a>
          ) : null}
        </div>
      </div>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          Wallet balances
        </h4>
        {snapshot.balancesError ? (
          <p className="text-xs font-mono text-red-400">
            {snapshot.balancesError}
          </p>
        ) : snapshot.balances.length === 0 ? (
          <p className="text-xs text-niko-muted">No wallets returned.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshot.balances.map((row) => (
              <div
                key={`${row.country}-${row.currency}-${row.provider}`}
                className="niko-panel p-5"
              >
                <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
                  {row.country} · {row.currency}
                </p>
                <p className="text-2xl font-bold font-mono text-foreground mt-2">
                  {row.currency === "RWF"
                    ? formatRwf(Number(row.balance))
                    : `${row.balance} ${row.currency}`}
                </p>
                <p className="text-[11px] text-niko-muted mt-1">
                  PawaPay wallet debit pool
                  {row.provider ? ` · ${row.provider}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-niko-muted">
          Successful payouts debit this wallet by the recipient amount. PawaPay
          does not return a separate per-payout fee on the API. Commercial
          charges, if any, appear in the PawaPay dashboard statements.
        </p>
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          Quote liquidity
        </h4>
        <p className="text-[11px] text-niko-muted">
          Spendable = wallet minus open payout transfers (pending/enqueued)
          minus live intents (detected/credited/payout_pending) that have no
          open transfer yet. Parked manual_review does not reserve. New quotes
          pause when the net local amount exceeds spendable.
        </p>
        {snapshot.liquidity.length === 0 ? (
          <p className="text-xs text-niko-muted">No liquidity rows.</p>
        ) : (
          <div className="rounded-md border border-niko-border/40 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-niko-border/30 bg-niko-surface/20 text-xs font-mono uppercase tracking-wider text-niko-muted">
                  <th className="px-4 py-3">Corridor</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">Open tx</th>
                  <th className="px-4 py-3">Live intents</th>
                  <th className="px-4 py-3">Spendable</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-niko-border/10">
                {snapshot.liquidity.map((row) => (
                  <tr key={`${row.country}-${row.currency}`}>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.country} · {row.currency}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatLiquidityAmount(row.available, row.currency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatLiquidityAmount(row.openTransfers, row.currency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatLiquidityAmount(row.liveIntents, row.currency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {formatLiquidityAmount(row.spendable, row.currency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-niko-muted">
                      {row.walletSource}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          Payout availability
        </h4>
        {snapshot.availabilityError ? (
          <p className="text-xs font-mono text-red-400">
            {snapshot.availabilityError}
          </p>
        ) : (
          <div className="rounded-md border border-niko-border/40 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-niko-border/30 bg-niko-surface/20 text-xs font-mono uppercase tracking-wider text-niko-muted">
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-niko-border/10">
                {snapshot.availability.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-niko-muted"
                    >
                      No payout availability returned.
                    </td>
                  </tr>
                ) : (
                  snapshot.availability.map((row) => (
                    <tr key={`${row.country}-${row.provider}`}>
                      <td className="px-4 py-3 font-mono">{row.country}</td>
                      <td className="px-4 py-3 font-mono">{row.provider}</td>
                      <td className="px-4 py-3">{statusChip(row.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          Stalled open payouts
        </h4>
        <p className="text-[11px] text-niko-muted">
          Pending or enqueued for more than 15 minutes. Poll should pick these
          up; cancel enqueued from the intent if the MMO is degraded.
        </p>
        {snapshot.stalledPayouts.length === 0 ? (
          <p className="text-xs font-mono text-niko-muted">
            No stalled open payouts.
          </p>
        ) : (
          <div className="rounded-md border border-amber-500/20 overflow-hidden">
            <ul className="divide-y divide-niko-border/10">
              {snapshot.stalledPayouts.map((row) => (
                <li
                  key={row.id}
                  className="px-4 py-3 flex items-center justify-between gap-3 text-xs font-mono"
                >
                  <span>
                    {row.status} · {row.country}
                    {row.provider ? ` · ${row.provider}` : ""} ·{" "}
                    {new Date(row.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {row.intentId ? (
                    <Link
                      href={`/admin/transactions/${row.intentId}`}
                      className="text-niko-teal hover:underline"
                    >
                      open
                    </Link>
                  ) : (
                    <span className="text-niko-muted">bulk</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          Configured corridors
        </h4>
        {snapshot.corridorsError ? (
          <p className="text-xs font-mono text-red-400">
            {snapshot.corridorsError}
          </p>
        ) : (
          <div className="rounded-md border border-niko-border/40 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-niko-border/30 bg-niko-surface/20 text-xs font-mono uppercase tracking-wider text-niko-muted">
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Limits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-niko-border/10">
                {snapshot.corridors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-niko-muted"
                    >
                      No payout corridors configured.
                    </td>
                  </tr>
                ) : (
                  snapshot.corridors.map((row) => (
                    <tr key={`${row.country}-${row.provider}-${row.currency}`}>
                      <td className="px-4 py-3 font-mono">{row.country}</td>
                      <td className="px-4 py-3">
                        {row.displayName}{" "}
                        <span className="font-mono text-xs text-niko-muted">
                          {row.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">{row.currency}</td>
                      <td className="px-4 py-3 font-mono text-xs text-niko-muted">
                        {row.minAmount} – {row.maxAmount}
                        {row.decimalsInAmount === "NONE"
                          ? " · whole amounts"
                          : ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">
            Payout history
          </h4>
          <p className="text-[11px] font-mono text-niko-muted">
            Paid out: {formatRwf(paidDebit)}
          </p>
        </div>
        <div className="niko-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead>
                <tr className="border-b border-niko-border/30 bg-niko-surface/20 text-xs text-niko-muted">
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium">Corridor</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payout id</th>
                  <th className="px-4 py-3 text-right font-medium">Intent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-niko-border/10">
                {snapshot.payouts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-niko-muted"
                    >
                      No PawaPay payouts yet.
                    </td>
                  </tr>
                ) : (
                  pagedPayouts.items.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-xs">
                        {new Date(row.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.country} · {row.provider ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                        {row.currency === "RWF"
                          ? formatRwf(row.amountRwf)
                          : `${row.amountRwf} ${row.currency}`}
                      </td>
                      <td className="px-4 py-3 text-xs">{row.status}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.referenceId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.intentId ? (
                          <Link
                            href={`/admin/transactions/${row.intentId}`}
                            className="font-mono text-xs text-niko-teal hover:underline"
                          >
                            open
                          </Link>
                        ) : (
                          <span className="font-mono text-xs text-niko-muted">
                            bulk
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-niko-border/40 px-4 py-3">
            <PaginationControls
              page={pagedPayouts.page}
              totalPages={pagedPayouts.totalPages}
              total={pagedPayouts.total}
              label="payouts"
              onPrev={() =>
                setPayoutPage((current) => Math.max(1, current - 1))
              }
              onNext={() => setPayoutPage((current) => current + 1)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function formatLiquidityAmount(
  value: number | null | undefined,
  currency: string,
): string {
  if (value == null) {
    return "—";
  }
  return currency === "RWF" ? formatRwf(value) : `${value} ${currency}`;
}

function statusChip(status: string) {
  const normalized = status.toUpperCase();
  const styles =
    normalized === "OPERATIONAL"
      ? "bg-niko-teal/15 text-niko-teal border-niko-teal/20"
      : normalized === "DELAYED"
        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
        : "bg-red-500/10 text-red-400 border-red-500/20";
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full border ${styles}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
