"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { PaymentIntent, PaymentStatus } from "@/lib/settlement/types";
import { PageHeader } from "@/components/shared/page-header";

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

  const formatRwf = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "RWF",
      maximumFractionDigits: 0,
    })
      .format(val)
      .replace("RWF", "RWF ");

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
                    {formatRwf(intent.netRwf)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Exchange rate
                  </span>
                  <span className="text-foreground">
                    1 USDT = {intent.rate} RWF
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Service fee
                  </span>
                  <span className="text-foreground">
                    {intent.feePercent}% ({formatRwf(intent.feeRwf)})
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Recipient (MTN)
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
                  Blockchain + MoMo references
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
                      MTN payout ref
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
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md space-y-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-niko-teal font-mono border-b border-niko-border/20 pb-3">
                Ops override controls
              </h4>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleStatusChange("paid")}
                  className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold rounded-md text-xs transition-all cursor-pointer"
                >
                  Force complete (paid)
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("manual_review")}
                  className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold rounded-md text-xs transition-all cursor-pointer"
                >
                  Move to manual review
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("awaiting_payment")}
                  className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold rounded-md text-xs transition-all cursor-pointer"
                >
                  Reset to awaiting
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("failed")}
                  className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-md text-xs transition-all cursor-pointer"
                >
                  Mark failed
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("expired")}
                  className="w-full py-2.5 bg-neutral-600/20 hover:bg-neutral-600/30 text-neutral-400 border border-neutral-600/40 font-bold rounded-md text-xs transition-all cursor-pointer"
                >
                  Force expired
                </button>
              </div>
              <p className="p-3 rounded bg-background/50 border border-niko-border/20 text-[10px] text-niko-muted leading-relaxed">
                Ops overrides bypass wallet and MTN confirmations. Use during
                audits or sandbox testing only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageHeader>
  );
}
