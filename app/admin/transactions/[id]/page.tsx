"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { displayPayoutRef } from "@/lib/payout-ref";
import type { PaymentIntent, PaymentStatus } from "@/lib/settlement/types";
import { canTransition } from "@/lib/settlement/transitions";
import { formatLocalAmount } from "@/lib/rates";
import { PageHeader } from "@/components/shared/page-header";
import type { PayoutLookupData } from "@/lib/pawapay/types";
import type { AdminAuditEntry } from "@/lib/admin-audit";

type Props = { params: Promise<{ id: string }> };

type PageState = "loading" | "ready" | "not_found";

const HEADERS = { "Content-Type": "application/json" };

export default function AdminTransactionDetailPage({ params }: Props) {
  const { id } = use(params);

  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [editTxHash, setEditTxHash] = useState("");
  const [editPayoutRef, setEditPayoutRef] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [livePayout, setLivePayout] = useState<PayoutLookupData | null>(null);
  const [livePayoutError, setLivePayoutError] = useState("");
  const [livePayoutLoading, setLivePayoutLoading] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);

  const loadAudit = async (intentId: string) => {
    const res = await fetch(`/api/admin/intents/${intentId}/audit`);
    if (!res.ok) {
      return;
    }
    const json = (await res.json()) as { data?: AdminAuditEntry[] };
    setAudit(json.data ?? []);
  };

  const loadLivePayout = async (payoutId: string) => {
    setLivePayoutLoading(true);
    setLivePayoutError("");
    const res = await fetch(`/api/admin/pawapay/payouts/${payoutId}`);
    const json = (await res.json()) as {
      data?: PayoutLookupData | null;
      error?: string;
    };
    setLivePayoutLoading(false);
    if (!res.ok) {
      setLivePayoutError(json.error ?? "Unable to load live PawaPay status.");
      return;
    }
    setLivePayout(json.data ?? null);
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/admin/intents/${id}`, { headers: HEADERS });
      if (cancelled) return;
      if (res.status === 404) {
        setPageState("not_found");
        return;
      }
      if (!res.ok) return;
      const json = (await res.json()) as { data: PaymentIntent };
      const data = json.data;
      setIntent(data);
      setEditTxHash(data.depositTx ?? "");
      setEditPayoutRef(displayPayoutRef(data) ?? "");
      setPageState("ready");
      void loadAudit(data.id);
      const payoutId = data.payout?.referenceId;
      if (payoutId) {
        const liveRes = await fetch(`/api/admin/pawapay/payouts/${payoutId}`);
        if (cancelled) return;
        const liveJson = (await liveRes.json()) as {
          data?: PayoutLookupData | null;
          error?: string;
        };
        if (!liveRes.ok) {
          setLivePayoutError(
            liveJson.error ?? "Unable to load live PawaPay status.",
          );
        } else {
          setLivePayout(liveJson.data ?? null);
        }
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id]);

  const patch = async (body: Record<string, unknown>) => {
    setSuccessMsg("");
    setErrorMsg("");
    const res = await fetch(`/api/admin/intents/${id}`, {
      method: "PATCH",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setErrorMsg(json.error ?? "Update failed.");
      return;
    }
    const json = (await res.json()) as { data: PaymentIntent };
    setIntent(json.data);
    setEditTxHash(json.data.depositTx ?? "");
    setEditPayoutRef(displayPayoutRef(json.data) ?? "");
    setSuccessMsg("Updated.");
    void loadAudit(id);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleStatusChange = (status: PaymentStatus) => patch({ status });

  const handleSaveReferences = (e: React.FormEvent) => {
    e.preventDefault();
    void patch({
      depositTx: editTxHash || null,
      payoutRef: editPayoutRef || null,
    });
  };

  const cancelEnqueued = async (payoutId: string) => {
    setCancelBusy(true);
    setSuccessMsg("");
    setErrorMsg("");
    const res = await fetch(`/api/admin/payouts/${payoutId}/fail-enqueued`, {
      method: "POST",
    });
    const json = (await res.json()) as {
      error?: string;
      data?: { status?: string };
    };
    setCancelBusy(false);
    if (!res.ok) {
      setErrorMsg(json.error ?? "Unable to cancel enqueued payout.");
      return;
    }
    setSuccessMsg(`Cancel accepted (${json.data?.status ?? "updated"}).`);
    await loadLivePayout(payoutId);
    const intentRes = await fetch(`/api/admin/intents/${id}`, {
      headers: HEADERS,
    });
    if (intentRes.ok) {
      const intentJson = (await intentRes.json()) as { data: PaymentIntent };
      setIntent(intentJson.data);
    }
    void loadAudit(id);
  };

  const formatMoney = (val: number, currency = intent?.currency ?? "RWF") =>
    formatLocalAmount(val, currency);

  const statusBadge = (status: PaymentStatus) => {
    const map: Record<PaymentStatus, string> = {
      paid: "bg-niko-teal/15 text-niko-teal border-niko-teal/20",
      failed: "bg-red-500/15 text-red-400 border-red-500/20",
      expired: "bg-neutral-600/20 text-neutral-400 border-neutral-600/30",
      awaiting_payment:
        "bg-[var(--niko-warning-bg)] text-[var(--niko-warning-text)] border-[var(--niko-warning-border)] animate-pulse",
      manual_review:
        "bg-[var(--niko-warning-bg)] text-[var(--niko-warning-text)] border-[var(--niko-warning-border)]",
      detected: "bg-sky-400/10 text-sky-400 border-sky-400/20",
      credited: "bg-indigo-400/10 text-indigo-400 border-indigo-400/20",
      payout_pending:
        "bg-blue-400/10 text-blue-400 border-blue-400/20 animate-pulse",
    };
    return (
      <span
        className={`px-2.5 py-1 text-xs font-semibold rounded border ${map[status] ?? "bg-niko-surface text-niko-muted border-niko-border"}`}
      >
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  if (pageState === "loading") {
    return (
      <PageHeader title="Transaction inspector" description={id}>
        <div className="flex justify-center py-20">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-niko-teal border-t-transparent" />
        </div>
      </PageHeader>
    );
  }

  if (pageState === "not_found" || !intent) {
    return (
      <PageHeader title="Transaction inspector" description={id}>
        <div className="text-center py-12 text-sm text-niko-muted font-sans bg-[var(--niko-card-bg)] border border-niko-border/40 rounded-md">
          Transaction not found.
        </div>
      </PageHeader>
    );
  }

  return (
    <PageHeader title="Transaction inspector" description={`Details for ${id}`}>
      <div className="space-y-6">
        <Link
          href="/admin/transactions"
          className="inline-flex items-center gap-1.5 text-xs text-niko-teal hover:underline font-mono"
        >
          &larr; Back to log
        </Link>

        {successMsg && (
          <div className="p-3 rounded-md bg-niko-teal/15 border border-niko-teal/20 text-niko-teal text-xs text-center">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md space-y-6">
              <div className="flex justify-between items-center border-b border-niko-border/20 pb-4">
                <span className="font-mono text-sm text-niko-muted">
                  ID: {intent.id}
                </span>
                {statusBadge(intent.status)}
              </div>

              <div className="grid grid-cols-2 gap-6 text-sm font-mono">
                <div>
                  <span className="text-xs text-niko-muted block">
                    USDT deposit
                  </span>
                  <span className="text-foreground font-bold">
                    {intent.usdtAmount.toFixed(2)} USDT
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Payout (net)
                  </span>
                  <span className="text-niko-teal-bright font-bold">
                    {formatMoney(intent.netRwf)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Exchange rate
                  </span>
                  <span className="text-foreground">
                    1 USDT = {intent.rate} {intent.currency}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">Fee</span>
                  <span className="text-foreground">
                    {intent.feePercent}% ({formatMoney(intent.feeRwf)})
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Corridor
                  </span>
                  <span className="text-foreground">
                    {intent.country} · {intent.provider} · {intent.currency}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Recipient (mobile money)
                  </span>
                  <span className="text-foreground font-semibold">
                    {intent.msisdn}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">Network</span>
                  <span className="text-foreground capitalize">
                    {intent.chain}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">Created</span>
                  <span className="text-foreground/80 font-sans">
                    {new Date(intent.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">Expires</span>
                  <span className="text-foreground/80 font-sans">
                    {new Date(intent.expiresAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <form
                onSubmit={handleSaveReferences}
                className="border-t border-niko-border/20 pt-6 space-y-4"
              >
                <h5 className="text-xs font-semibold uppercase tracking-wider text-niko-teal font-mono">
                  Blockchain + payout references
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      USDT deposit tx hash
                    </label>
                    <input
                      type="text"
                      value={editTxHash}
                      onChange={(e) => setEditTxHash(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-background border border-niko-border text-foreground px-3 py-1.5 text-xs font-mono rounded-md outline-none focus:border-niko-teal/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      Payout reference
                    </label>
                    <input
                      type="text"
                      value={editPayoutRef}
                      onChange={(e) => setEditPayoutRef(e.target.value)}
                      placeholder="UUID or ref..."
                      className="w-full bg-background border border-niko-border text-foreground px-3 py-1.5 text-xs font-mono rounded-md outline-none focus:border-niko-teal/50"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-niko-teal/20 hover:bg-niko-teal/30 text-niko-teal border border-niko-teal/40 rounded-md text-xs font-bold transition-all cursor-pointer"
                  >
                    Save references
                  </button>
                </div>
              </form>
            </div>

            {intent.payout ? (
              <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-niko-teal font-mono">
                    PawaPay payout
                  </h5>
                  <button
                    type="button"
                    onClick={() =>
                      void loadLivePayout(intent.payout!.referenceId)
                    }
                    className="text-[11px] font-semibold text-niko-teal hover:underline"
                  >
                    {livePayoutLoading ? "Refreshing…" : "Refresh live status"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div>
                    <span className="text-xs text-niko-muted block">
                      Recipient amount
                    </span>
                    <span className="text-foreground font-bold">
                      {formatMoney(intent.netRwf)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-niko-muted block">
                      Local status
                    </span>
                    <span className="text-foreground">
                      {intent.payout.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-niko-muted block">
                      Payout id
                    </span>
                    <span className="text-foreground break-all">
                      {intent.payout.referenceId}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-niko-muted block">
                      Provider ref
                    </span>
                    <span className="text-foreground break-all">
                      {intent.payout.providerRef ?? "—"}
                    </span>
                  </div>
                </div>
                {livePayoutError ? (
                  <p className="text-xs text-red-400">{livePayoutError}</p>
                ) : livePayout ? (
                  <div className="text-xs font-mono text-niko-muted space-y-1 border-t border-niko-border/20 pt-3">
                    <p>
                      Live: {livePayout.status}
                      {livePayout.amount
                        ? ` · ${livePayout.amount} ${livePayout.currency ?? ""}`
                        : ""}
                    </p>
                    {livePayout.provider ? <p>{livePayout.provider}</p> : null}
                    {livePayout.failureReason ? (
                      <p className="text-red-400">
                        {livePayout.failureReason.failureCode}:{" "}
                        {livePayout.failureReason.failureMessage}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-niko-muted">
                    No live PawaPay record found for this payout id.
                  </p>
                )}
                <p className="text-[11px] text-niko-muted">
                  Amount is the wallet debit to the recipient. NikoPay fee is
                  taken from USDT before payout.
                </p>
                {intent.payout.status === "enqueued" ? (
                  <button
                    type="button"
                    disabled={cancelBusy}
                    onClick={() =>
                      void cancelEnqueued(intent.payout!.referenceId)
                    }
                    className="w-full py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-400/30 font-bold rounded-md text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {cancelBusy ? "Cancelling…" : "Cancel enqueued payout"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {audit.length > 0 ? (
              <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md space-y-3">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-niko-teal font-mono">
                  Admin audit
                </h5>
                <ul className="space-y-2">
                  {audit.map((row) => (
                    <li
                      key={row.id}
                      className="text-[11px] font-mono text-niko-muted border-b border-niko-border/20 pb-2 last:border-0"
                    >
                      <span className="text-foreground">{row.action}</span>
                      {row.fromStatus || row.toStatus
                        ? ` · ${row.fromStatus ?? "—"} → ${row.toStatus ?? "—"}`
                        : ""}
                      {row.detail ? ` · ${row.detail}` : ""}
                      <span className="block mt-0.5">
                        {row.actor.slice(0, 10)}… ·{" "}
                        {new Date(row.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md space-y-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-niko-teal font-mono border-b border-niko-border/20 pb-3">
                Ops override controls
              </h4>
              <div className="space-y-3">
                {canTransition(intent.status, "paid", "admin") ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("paid")}
                    className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold rounded-md text-xs transition-all cursor-pointer"
                  >
                    Mark paid
                  </button>
                ) : null}
                {canTransition(intent.status, "credited", "admin") ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("credited")}
                    className="w-full py-2.5 bg-niko-teal/10 hover:bg-niko-teal/20 text-niko-teal border border-niko-teal/30 font-bold rounded-md text-xs transition-all cursor-pointer"
                  >
                    Retry payout
                  </button>
                ) : null}
                {canTransition(intent.status, "manual_review", "admin") ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("manual_review")}
                    className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold rounded-md text-xs transition-all cursor-pointer"
                  >
                    Move to manual review
                  </button>
                ) : null}
                {canTransition(intent.status, "failed", "admin") ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("failed")}
                    className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-md text-xs transition-all cursor-pointer"
                  >
                    Mark failed
                  </button>
                ) : null}
                {canTransition(intent.status, "expired", "admin") ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("expired")}
                    className="w-full py-2.5 bg-neutral-600/20 hover:bg-neutral-600/30 text-neutral-400 border border-neutral-600/40 font-bold rounded-md text-xs transition-all cursor-pointer"
                  >
                    Mark expired
                  </button>
                ) : null}
              </div>
              <p className="p-3 rounded bg-background/50 border border-niko-border/20 text-[10px] text-niko-muted leading-relaxed">
                Overrides follow the payment state machine. Retry payout starts
                a new PawaPay payout id. Mark paid is only allowed from payout
                pending. Reset to awaiting is not allowed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageHeader>
  );
}
