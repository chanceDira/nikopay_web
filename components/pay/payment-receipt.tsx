"use client";

import { useState, useEffect } from "react";
import { getMockIntent } from "@/lib/fixtures";
import type { PaymentIntent } from "@/lib/settlement/types";
import { formatRwf, formatUsdt } from "@/lib/rates";
import Link from "next/link";

type PaymentReceiptProps = {
  id?: string;
};

export function PaymentReceipt({ id }: PaymentReceiptProps) {
  const [intent, setIntent] = useState<PaymentIntent | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadData = () => {
      const data = getMockIntent(id);
      if (data) {
        setIntent(data);
      }
      setLoading(false);
    };

    loadData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-niko-teal border-t-transparent" />
        <p className="text-xs text-niko-muted">Loading receipt...</p>
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="text-center py-12 space-y-3">
        <h3 className="text-base font-bold text-foreground">
          Receipt Not Found
        </h3>
        <p className="text-xs text-niko-muted">
          No transaction matching this ID was found.
        </p>
        <Link
          href="/app/payments"
          className="inline-block px-3 py-1.5 border border-niko-border hover:border-niko-teal text-xs rounded-lg transition-colors"
        >
          Return to History
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(intent.createdAt).toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Action Buttons - Hidden when printing */}
      <div className="flex justify-between items-center print:hidden">
        <Link
          href={`/app/payments/${id}`}
          className="flex items-center gap-1.5 text-xs text-niko-muted hover:text-foreground transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Timeline
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(0,212,200,0.1)]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print Receipt
        </button>
      </div>

      {/* Printable Receipt Card */}
      <div className="bg-niko-surface/60 border border-niko-border rounded-md p-6 sm:p-8 space-y-6 print:border-none print:bg-white print:text-black">
        {/* Branding header */}
        <div className="flex justify-between items-start border-b border-niko-border/60 pb-5 print:border-neutral-200">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground print:text-black">
              NikoPay
            </h1>
            <p className="text-xs text-niko-muted print:text-neutral-500 mt-1">
              Instant Blockchain Payouts
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-niko-teal/10 border border-niko-teal/30 text-niko-teal print:bg-neutral-100 print:text-neutral-700 print:border-neutral-300">
              {intent.status}
            </span>
            <p className="text-[10px] text-niko-muted print:text-neutral-500 mt-2 font-mono">
              {intent.id}
            </p>
          </div>
        </div>

        {/* Core meta */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-niko-muted print:text-neutral-500">
              Date & Time
            </p>
            <p className="mt-1 font-semibold text-foreground print:text-black">
              {formattedDate}
            </p>
          </div>
          <div className="text-right">
            <p className="text-niko-muted print:text-neutral-500">
              Network / Chain
            </p>
            <p className="mt-1 font-semibold text-foreground print:text-black capitalize">
              {intent.chain}
            </p>
          </div>
        </div>

        {/* Transfer details block */}
        <div className="p-4 rounded-md bg-background/50 border border-niko-border/50 print:bg-neutral-50 print:border-neutral-200 space-y-3.5">
          <div className="flex justify-between text-xs">
            <span className="text-niko-muted print:text-neutral-500">
              USDT Sent
            </span>
            <span className="font-mono font-semibold text-foreground print:text-black">
              {formatUsdt(intent.usdtAmount)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-niko-muted print:text-neutral-500">
              Exchange Rate
            </span>
            <span className="font-mono text-foreground print:text-black">
              1 USDT = {intent.rate.toLocaleString()} RWF
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-niko-muted print:text-neutral-500">
              Gross Payout
            </span>
            <span className="font-mono text-foreground print:text-black">
              {formatRwf(intent.usdtAmount * intent.rate)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-niko-muted print:text-neutral-500">
              Service Fee ({intent.feePercent}%)
            </span>
            <span className="font-mono text-rose-400 print:text-neutral-700">
              -{formatRwf(intent.feeRwf)}
            </span>
          </div>
          <div className="h-px bg-niko-border/60 print:bg-neutral-200 my-1" />
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold text-foreground print:text-black">
              Amount Credited (RWF)
            </span>
            <span className="text-base font-extrabold text-niko-teal print:text-black font-mono">
              {formatRwf(intent.netRwf)}
            </span>
          </div>
        </div>

        {/* Destination information */}
        <div className="space-y-3 text-xs pt-2">
          <div className="flex justify-between border-b border-niko-border/30 pb-2 print:border-neutral-200">
            <span className="text-niko-muted print:text-neutral-500">
              Recipient Mobile Number
            </span>
            <span className="font-mono font-bold text-foreground print:text-black">
              {intent.msisdn}
            </span>
          </div>

          <div className="flex justify-between border-b border-niko-border/30 pb-2 print:border-neutral-200">
            <span className="text-niko-muted print:text-neutral-500">
              Deposit Address
            </span>
            <span
              className="font-mono text-[10px] text-foreground print:text-black truncate max-w-[200px] sm:max-w-xs"
              title={intent.treasuryAddress}
            >
              {intent.treasuryAddress}
            </span>
          </div>

          {intent.depositTx && (
            <div className="flex justify-between border-b border-niko-border/30 pb-2 print:border-neutral-200">
              <span className="text-niko-muted print:text-neutral-500">
                Deposit Tx Hash
              </span>
              <span
                className="font-mono text-[10px] text-foreground print:text-black truncate max-w-[200px] sm:max-w-xs"
                title={intent.depositTx}
              >
                {intent.depositTx}
              </span>
            </div>
          )}

          {intent.momoRef && (
            <div className="flex justify-between border-b border-niko-border/30 pb-2 print:border-neutral-200">
              <span className="text-niko-muted print:text-neutral-500">
                MTN Payout Reference
              </span>
              <span className="font-mono font-bold text-foreground print:text-black">
                {intent.momoRef}
              </span>
            </div>
          )}
        </div>

        {/* Receipt Footer */}
        <div className="text-center pt-4 border-t border-niko-border/60 print:border-neutral-200">
          <p className="text-[10px] text-niko-muted print:text-neutral-400 leading-relaxed">
            Payment handled by NikoPay (RDB Registered Entity).
            <br />
            For support questions, write to info@nikopay.rw.
          </p>
        </div>
      </div>
    </div>
  );
}
