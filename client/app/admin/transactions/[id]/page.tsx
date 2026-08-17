"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getMockIntent, forceTransition, saveMockIntent } from "@/lib/fixtures";
import type { PaymentIntent, PaymentStatus } from "@/lib/settlement/types";
import { PageHeader } from "@/components/shared/page-header";

type AdminTransactionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function AdminTransactionDetailPage({
  params,
}: AdminTransactionDetailPageProps) {
  const { id } = use(params);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);

  const [editTxHash, setEditTxHash] = useState("");
  const [editMomoRef, setEditMomoRef] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadIntent = () => {
    const data = getMockIntent(id);
    if (data) {
      setIntent(data);
      setEditTxHash(data.depositTx || "");
      setEditMomoRef(data.momoRef || "");
    }
  };

  useEffect(() => {
    loadIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatusChange = (status: PaymentStatus) => {
    setSuccessMsg("");
    forceTransition(id, status);

    // Simulate RWF disbursement adjustment if transitioned to paid
    if (status === "paid" && intent && intent.status !== "paid") {
      const storedMomo =
        localStorage.getItem("nikopay_momo_balance") || "4500000";
      const currentMomo = parseInt(storedMomo, 10);
      const newMomo = Math.max(0, currentMomo - intent.netRwf);
      localStorage.setItem("nikopay_momo_balance", newMomo.toString());
    }

    setSuccessMsg(
      `Status updated to "${status.replace("_", " ")}" successfully.`,
    );
    loadIntent();
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleSaveReferences = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intent) return;

    setSuccessMsg("");
    const updated = {
      ...intent,
      depositTx: editTxHash || undefined,
      momoRef: editMomoRef || undefined,
    };
    saveMockIntent(updated);
    setSuccessMsg("References updated successfully.");
    loadIntent();
    setTimeout(() => setSuccessMsg(""), 3000);
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

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-niko-teal/15 text-niko-teal border border-niko-teal/20">
            Paid
          </span>
        );
      case "failed":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-500/15 text-rose-400 border border-rose-500/20 font-bold">
            Failed
          </span>
        );
      case "expired":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-neutral-600/20 text-neutral-400 border border-neutral-600/30">
            Expired
          </span>
        );
      case "awaiting_payment":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-[var(--niko-warning-bg)] text-[var(--niko-warning-text)] border border-[var(--niko-warning-border)] animate-pulse">
            Awaiting Payment
          </span>
        );
      case "manual_review":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-[var(--niko-warning-bg)] text-[var(--niko-warning-text)] border border-[var(--niko-warning-border)]">
            Manual Review
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
            {status.replace("_", " ")}
          </span>
        );
    }
  };

  if (!intent) {
    return (
      <PageHeader
        title="Transaction Details"
        description="Loading transaction info..."
      >
        <div className="text-center py-12 text-sm text-niko-muted font-sans bg-[var(--niko-card-bg)] border border-niko-border/40 rounded-md">
          Transaction not found.
        </div>
      </PageHeader>
    );
  }

  return (
    <PageHeader
      title={`Transaction Inspector`}
      description={`Management details for ${id}`}
    >
      <div className="space-y-6">
        {/* Back navigation */}
        <Link
          href="/admin/transactions"
          className="inline-flex items-center gap-1.5 text-xs text-niko-teal hover:underline font-mono"
        >
          &larr; Back to Log
        </Link>

        {successMsg && (
          <div className="p-3 rounded-md bg-niko-teal/15 border border-niko-teal/20 text-niko-teal text-xs text-center font-sans">
            {successMsg}
          </div>
        )}

        {/* Detailed Metrics Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md space-y-6">
              <div className="flex justify-between items-center border-b border-niko-border/20 pb-4">
                <span className="font-mono text-sm text-niko-muted">
                  ID: {intent.id}
                </span>
                {getStatusBadge(intent.status)}
              </div>

              {/* Form parameters grid */}
              <div className="grid grid-cols-2 gap-6 text-sm font-mono">
                <div>
                  <span className="text-xs text-niko-muted block">
                    USDT Amount (Deposit):
                  </span>
                  <span className="text-foreground font-bold">
                    {intent.usdtAmount.toFixed(2)} USDT
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    RWF Payout (Net):
                  </span>
                  <span className="text-niko-teal-bright font-bold">
                    {formatRwf(intent.netRwf)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Exchange rate used:
                  </span>
                  <span className="text-foreground">
                    1 USDT = {intent.rate} RWF
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Service fee:
                  </span>
                  <span className="text-foreground">
                    {intent.feePercent}% ({formatRwf(intent.feeRwf)})
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Recipient Phone (MTN):
                  </span>
                  <span className="text-foreground font-semibold">
                    {intent.msisdn}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Network Chain:
                  </span>
                  <span className="text-foreground capitalize">
                    {intent.chain}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Created Timestamp:
                  </span>
                  <span className="text-foreground/80 font-sans">
                    {new Date(intent.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-niko-muted block">
                    Expiry Timestamp:
                  </span>
                  <span className="text-foreground/80 font-sans">
                    {new Date(intent.expiresAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Interactive Ref Hashes Form */}
              <form
                onSubmit={handleSaveReferences}
                className="border-t border-niko-border/20 pt-6 space-y-4"
              >
                <h5 className="text-xs font-semibold uppercase tracking-wider text-niko-teal font-mono">
                  Blockchain & MTN Mobile Money references
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1 font-sans">
                      USDT Deposit Tx Hash
                    </label>
                    <input
                      type="text"
                      value={editTxHash}
                      onChange={(e) => setEditTxHash(e.target.value)}
                      placeholder="e.g. 0x25a6cf49..."
                      className="w-full bg-background border border-niko-border text-foreground px-3 py-1.5 text-xs font-mono rounded-md outline-none focus:border-niko-teal/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1 font-sans">
                      MTN Payout Reference (momoRef)
                    </label>
                    <input
                      type="text"
                      value={editMomoRef}
                      onChange={(e) => setEditMomoRef(e.target.value)}
                      placeholder="e.g. REF-83920..."
                      className="w-full bg-background border border-niko-border text-foreground px-3 py-1.5 text-xs font-mono rounded-md outline-none focus:border-niko-teal/50"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-niko-teal/20 hover:bg-niko-teal/30 text-niko-teal border border-niko-teal/40 rounded-md text-xs font-bold transition-all cursor-pointer"
                  >
                    Save References
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Quick Manual Actions sidebar panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md space-y-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-niko-teal font-mono border-b border-niko-border/20 pb-3">
                Ops Override Controls
              </h4>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleStatusChange("paid")}
                  className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold rounded-md text-xs transition-all cursor-pointer"
                >
                  Force Complete (Paid)
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange("manual_review")}
                  className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold rounded-md text-xs transition-all cursor-pointer"
                >
                  Move to Manual Review
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange("awaiting_payment")}
                  className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold rounded-md text-xs transition-all cursor-pointer"
                >
                  Reset status (Awaiting)
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange("failed")}
                  className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-md text-xs transition-all cursor-pointer"
                >
                  Mark Fail/Cancelled
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange("expired")}
                  className="w-full py-2.5 bg-neutral-600/20 hover:bg-neutral-600/30 text-neutral-400 border border-neutral-600/40 font-bold rounded-md text-xs transition-all cursor-pointer"
                >
                  Force Expired
                </button>
              </div>

              <div className="p-3 rounded bg-background/50 border border-niko-border/20 text-[10px] text-niko-muted leading-relaxed font-sans">
                <strong>Attention:</strong> Ops overrides bypass wallet contract
                logic and MTN API confirmations. Use strictly during audits or
                sandbox payouts.
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageHeader>
  );
}
