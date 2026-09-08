"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { PaymentIntent, PaymentStatus } from "@/lib/settlement/types";
import { canTransition } from "@/lib/settlement/transitions";
import { feeUsdtForAmount } from "@/lib/settlement/quote";
import { formatLocalAmount, formatUsdt } from "@/lib/rates";
import { PageHeader } from "@/components/shared/page-header";
import type { PayoutLookupData } from "@/lib/pawapay/types";

type Props = { params: Promise<{ id: string }> };

type PageState = "loading" | "ready" | "not_found";

const HEADERS = { "Content-Type": "application/json" };

export default function AdminTransactionDetailPage({ params }: Props) {
  const { id } = use(params);

  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [editTxHash, setEditTxHash] = useState("");
  const [editMomoRef, setEditMomoRef] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [livePayout, setLivePayout] = useState<PayoutLookupData | null>(null);
  const [livePayoutError, setLivePayoutError] = useState("");
  const [livePayoutLoading, setLivePayoutLoading] = useState(false);

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
      setEditMomoRef(data.momoRef ?? "");
      setPageState("ready");
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
    setEditMomoRef(json.data.momoRef ?? "");
    setSuccessMsg("Updated.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleStatusChange = (status: PaymentStatus) => patch({ status });

  const handleSaveReferences = (e: React.FormEvent) => {
    e.preventDefault();
    void patch({ depositTx: editTxHash || null, momoRef: editMomoRef || null });
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
                    RWF payout (net)
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
                  <span className="text-xs text-niko-muted block">
                    Service fee
                  </span>
                  <span className="text-foreground">
                    {intent.feePercent}% ({formatMoney(intent.feeRwf)}
                    {feeUsdtForAmount(intent.usdtAmount, intent.feePercent) !=
                    null
                      ? ` · ${formatUsdt(feeUsdtForAmount(intent.usdtAmount, intent.feePercent) ?? 0)} from USDT`
                      : ""}
                    )
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
                      value={editMomoRef}
                      onChange={(e) => setEditMomoRef(e.target.value)}
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
                  Recipient amount is what we send through PawaPay (merchant
                  wallet debit). NikoPay fee is already taken from the user
                  USDT. PawaPay does not return a per-payout provider fee on the
                  API. Commercial charges, if any, are on PawaPay statements.
                </p>
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
