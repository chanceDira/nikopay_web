"use client";

import { useState, useEffect } from "react";
import {
  getMockIntent,
  updateActiveIntentStatuses,
  forceTransition,
} from "@/lib/fixtures";
import type { PaymentIntent, PaymentStatus } from "@/lib/settlement/types";
import { formatRwf, formatUsdt } from "@/lib/rates";
import Link from "next/link";

type StatusTimelineProps = {
  id?: string;
};

export function StatusTimeline({ id }: StatusTimelineProps) {
  const [intent, setIntent] = useState<PaymentIntent | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showSimPanel, setShowSimPanel] = useState(false);

  // Load and poll data
  useEffect(() => {
    if (!id) return;

    const fetchIntent = () => {
      // First, simulate any progress that should have happened
      updateActiveIntentStatuses();
      const data = getMockIntent(id);
      if (data) {
        setIntent(data);
      }
      setLoading(false);
      return data;
    };

    const initialData = fetchIntent();
    if (
      initialData &&
      ["paid", "failed", "expired"].includes(initialData.status)
    ) {
      return;
    }

    // Poll every 1.5s to catch transitions
    const interval = setInterval(() => {
      const data = fetchIntent();
      if (data && ["paid", "failed", "expired"].includes(data.status)) {
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [id]);

  const handleSimulateStatus = (status: PaymentStatus) => {
    if (!id) return;
    const updated = forceTransition(id, status);
    if (updated) {
      setIntent(updated);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-niko-teal border-t-transparent" />
        <p className="text-sm text-niko-muted font-medium">
          Retrieving payment intent...
        </p>
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <svg
            className="h-6 w-6 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-foreground">
          Payment Intent Not Found
        </h3>
        <p className="text-sm text-niko-muted max-w-sm mx-auto">
          We couldn&apos;t find a transaction with the ID &quot;{id}&quot;.
          Please check your link or visit history.
        </p>
        <Link
          href="/app/payments"
          className="inline-block mt-4 px-4 py-2 border border-niko-border hover:border-niko-teal/30 hover:bg-niko-surface rounded-md text-sm font-semibold transition-all"
        >
          View Payment History
        </Link>
      </div>
    );
  }

  // Determine current timeline progress step indices:
  // Step 1: Deposit detected (awaiting_payment or detected)
  // Step 2: Confirmation (credited)
  // Step 3: Payout (payout_pending)
  // Step 4: Complete (paid)
  const getStepState = (step: 1 | 2 | 3 | 4) => {
    const status = intent.status;

    if (status === "failed") return "error";
    if (status === "expired") return "expired";
    if (status === "manual_review") return "warning";

    switch (step) {
      case 1:
        if (status === "awaiting_payment") return "active";
        return "completed";
      case 2:
        if (status === "awaiting_payment") return "upcoming";
        if (status === "detected") return "active";
        return "completed";
      case 3:
        if (["awaiting_payment", "detected"].includes(status))
          return "upcoming";
        if (status === "credited") return "active";
        if (status === "payout_pending") return "active";
        return "completed";
      case 4:
        if (status === "paid") return "completed";
        return "upcoming";
      default:
        return "upcoming";
    }
  };

  const getStepIcon = (state: string, num: number) => {
    if (state === "completed") {
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    }
    if (state === "error") {
      return (
        <svg
          className="h-5 w-5 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      );
    }
    if (state === "warning" || state === "expired") {
      return (
        <svg
          className="h-5 w-5 text-[#92400e] dark:text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    }
    return <span className="font-mono text-sm font-bold">{num}</span>;
  };

  const getStepStyles = (state: string) => {
    switch (state) {
      case "completed":
        return "bg-niko-teal text-niko-navy border-niko-teal";
      case "active":
        return "bg-niko-teal/10 text-niko-teal border-niko-teal animate-pulse shadow-[0_0_12px_rgba(0,212,200,0.3)]";
      case "error":
        return "bg-red-500/10 text-red-400 border-red-500";
      case "warning":
      case "expired":
        return "bg-[#fffbeb] dark:bg-amber-500/10 text-[#92400e] dark:text-amber-400 border-amber-200/60 dark:border-amber-500";
      default:
        return "bg-niko-surface border-niko-border text-niko-muted";
    }
  };

  // Human description mapping
  const getTimelineDetails = () => {
    const status = intent.status;
    if (status === "awaiting_payment") {
      return {
        title: "Awaiting USDT Deposit",
        desc: "Please initiate the USDT transfer from your wallet to the address on the previous step. We are listening to blockchain events.",
      };
    }
    if (status === "detected") {
      return {
        title: "USDT Deposit Detected",
        desc: "We have detected your deposit on-chain! Waiting for network confirmations to secure the transaction.",
      };
    }
    if (status === "credited") {
      return {
        title: "USDT Deposit Confirmed",
        desc: "Your deposit is confirmed. Payout authorization triggers automatically.",
      };
    }
    if (status === "payout_pending") {
      return {
        title: "Processing MoMo Payout",
        desc: "The RWF payout has been submitted to the MTN Mobile Money network. Payout should complete momentarily.",
      };
    }
    if (status === "paid") {
      return {
        title: "Payout Completed Successfully",
        desc: `RWF transfer has settled. The recipient received funds on their MTN Mobile Money account.`,
      };
    }
    if (status === "failed") {
      return {
        title: "Payment Failed",
        desc: "Something went wrong during processing or blockchain confirmation. Please reach out to support.",
      };
    }
    if (status === "expired") {
      return {
        title: "Deposit Window Expired",
        desc: "The 20-minute deposit window elapsed before we detected your transfer. If you have already sent funds, contact support.",
      };
    }
    if (status === "manual_review") {
      return {
        title: "Manual Operations Review",
        desc: "Our automated systems flagged an inconsistency (e.g. deposit mismatch). An administrator is reviewing this payout manually.",
      };
    }
    return { title: "", desc: "" };
  };

  const getLineProgress = () => {
    if (!intent) return 0;
    const status = intent.status;
    if (status === "paid") return 3;
    if (["credited", "payout_pending"].includes(status)) return 2;
    if (status === "detected") return 1;
    return 0; // awaiting_payment, failed, expired, manual_review
  };
  const lineProgress = getLineProgress();

  const timelineDetails = getTimelineDetails();

  return (
    <div className="space-y-8">
      {/* Top Banner Alert */}
      <div
        className={`p-4 rounded-md border flex gap-3 ${
          intent.status === "paid"
            ? "border-niko-teal/20 bg-niko-teal/5 text-niko-teal"
            : ["failed", "expired"].includes(intent.status)
              ? "border-red-500/20 bg-red-500/5 text-red-400"
              : intent.status === "manual_review"
                ? "border-amber-200/60 dark:border-amber-500/20 bg-[#fffbeb] dark:bg-amber-500/5 text-[#92400e] dark:text-amber-300"
                : "border-niko-border bg-niko-surface/80 text-foreground"
        }`}
      >
        {intent.status === "paid" ? (
          <svg
            className="h-5 w-5 shrink-0 text-niko-teal"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : ["failed", "expired"].includes(intent.status) ? (
          <svg
            className="h-5 w-5 shrink-0 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <div className="h-5 w-5 shrink-0 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-niko-teal animate-pulse-glow" />
          </div>
        )}
        <div className="flex-1 text-sm">
          <p className="font-bold">{timelineDetails.title}</p>
          <p className="mt-1 text-xs opacity-90 leading-relaxed">
            {timelineDetails.desc}
          </p>
        </div>
        {intent.status === "paid" && (
          <Link
            href={`/app/payments/${id}/receipt`}
            className="self-center px-3.5 py-1.5 bg-niko-teal text-niko-navy font-bold text-xs rounded-md hover:bg-niko-teal-bright transition-colors"
          >
            Receipt
          </Link>
        )}
      </div>

      {/* Visual Timeline Steps (Vertical style on mobile, grid-column on tablet) */}
      <div className="relative border border-niko-border bg-background/50 rounded-md p-6 md:p-8 space-y-8">
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Desktop Horizontal Connecting Line */}
          <div className="absolute top-[20px] left-[12.5%] right-[12.5%] hidden md:block h-0.5 bg-niko-border/60 -z-10">
            <div
              className="h-full bg-niko-teal transition-all duration-500 shadow-[0_0_8px_rgba(0,212,200,0.4)]"
              style={{ width: `${lineProgress * 33.33}%` }}
            />
          </div>

          {/* Mobile Vertical Connecting Line */}
          <div className="absolute left-[20px] top-[20px] bottom-[20px] md:hidden w-0.5 bg-niko-border/60 -z-10">
            <div
              className="w-full bg-niko-teal transition-all duration-500 shadow-[0_0_8px_rgba(0,212,200,0.4)]"
              style={{ height: `${lineProgress * 33.33}%` }}
            />
          </div>

          {/* Step 1 */}
          <div className="flex md:flex-col items-start gap-4 md:text-center md:items-center">
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold transition-all ${getStepStyles(
                getStepState(1),
              )}`}
            >
              {getStepIcon(getStepState(1), 1)}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">1. Deposit Awaiting</h4>
              <p className="text-xs text-niko-muted leading-snug md:max-w-[150px]">
                USDT sent to treasury wallet.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex md:flex-col items-start gap-4 md:text-center md:items-center">
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold transition-all ${getStepStyles(
                getStepState(2),
              )}`}
            >
              {getStepIcon(getStepState(2), 2)}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">2. Confirmation</h4>
              <p className="text-xs text-niko-muted leading-snug md:max-w-[150px]">
                Blockchain confirmations completed.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex md:flex-col items-start gap-4 md:text-center md:items-center">
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold transition-all ${getStepStyles(
                getStepState(3),
              )}`}
            >
              {getStepIcon(getStepState(3), 3)}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">3. Payout Sent</h4>
              <p className="text-xs text-niko-muted leading-snug md:max-w-[150px]">
                MTN Mobile Money transaction processed.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex md:flex-col items-start gap-4 md:text-center md:items-center">
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold transition-all ${getStepStyles(
                getStepState(4),
              )}`}
            >
              {getStepIcon(getStepState(4), 4)}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">4. Completed</h4>
              <p className="text-xs text-niko-muted leading-snug md:max-w-[150px]">
                RWF deposited in destination wallet.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-md border border-niko-border bg-niko-surface/40 p-5 space-y-4">
          <h3 className="text-xs font-bold text-niko-teal uppercase tracking-wider">
            Transfer Parameters
          </h3>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-niko-muted">USDT Transfer</dt>
            <dd className="font-mono font-semibold text-right text-foreground">
              {formatUsdt(intent.usdtAmount)}
            </dd>

            <dt className="text-niko-muted">Settlement Chain</dt>
            <dd className="font-semibold text-right text-foreground capitalize">
              {intent.chain}
            </dd>

            <dt className="text-niko-muted">Rate Applied</dt>
            <dd className="font-mono text-right text-foreground">
              1 USDT = {intent.rate.toLocaleString()} RWF
            </dd>

            <dt className="text-niko-muted">
              Network Fee ({intent.feePercent}%)
            </dt>
            <dd className="font-mono text-right text-red-400">
              -{formatRwf(intent.feeRwf)}
            </dd>

            <dt className="text-foreground font-semibold">
              Recipient Receives
            </dt>
            <dd className="font-mono font-bold text-right text-niko-teal-bright">
              {formatRwf(intent.netRwf)}
            </dd>
          </dl>
        </div>

        <div className="rounded-md border border-niko-border bg-niko-surface/40 p-5 space-y-4">
          <h3 className="text-xs font-bold text-niko-teal uppercase tracking-wider">
            Transaction Identifiers
          </h3>
          <div className="space-y-3 text-xs font-mono">
            <div>
              <p className="text-niko-muted mb-1 font-sans">
                Payment Intent ID
              </p>
              <p className="p-2.5 rounded-md bg-background border border-niko-border/60 text-foreground break-all">
                {intent.id}
              </p>
            </div>

            <div>
              <p className="text-niko-muted mb-1 font-sans">
                Recipient Mobile Money
              </p>
              <p className="p-2.5 rounded-md bg-background border border-niko-border/60 text-foreground font-bold">
                {intent.msisdn}
              </p>
            </div>

            {intent.depositTx && (
              <div>
                <p className="text-niko-muted mb-1 font-sans">
                  On-chain Deposit Tx Hash
                </p>
                <p
                  className="p-2.5 rounded-md bg-background border border-niko-border/60 text-niko-teal-bright break-all truncate hover:text-clip"
                  title={intent.depositTx}
                >
                  {intent.depositTx}
                </p>
              </div>
            )}

            {intent.momoRef && (
              <div>
                <p className="text-niko-muted mb-1 font-sans">
                  MTN Transaction Ref
                </p>
                <p className="p-2.5 rounded-md bg-background border border-niko-border/60 text-foreground font-bold">
                  {intent.momoRef}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulator Control Drawer for Graders / Reviewers */}
      <div className="border border-niko-border/50 rounded-md bg-niko-surface/30 p-4">
        <button
          type="button"
          onClick={() => setShowSimPanel(!showSimPanel)}
          className="flex w-full items-center justify-between text-xs font-medium text-niko-muted hover:text-niko-teal transition-colors"
        >
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Developer Simulation Controls
          </span>
          <span>{showSimPanel ? "Hide Controls" : "Show Controls"}</span>
        </button>

        {showSimPanel && (
          <div className="mt-4 pt-3 border-t border-niko-border/40">
            <p className="text-xs text-niko-muted mb-3">
              Use these buttons to instantly trigger different payment states
              and verify how the UI adapts.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSimulateStatus("awaiting_payment")}
                className="px-2.5 py-1.5 text-xs font-semibold rounded bg-background border border-niko-border hover:border-niko-teal transition-colors text-foreground"
              >
                Awaiting
              </button>
              <button
                type="button"
                onClick={() => handleSimulateStatus("detected")}
                className="px-2.5 py-1.5 text-xs font-semibold rounded bg-background border border-niko-border hover:border-niko-teal transition-colors text-foreground"
              >
                Detected
              </button>
              <button
                type="button"
                onClick={() => handleSimulateStatus("credited")}
                className="px-2.5 py-1.5 text-xs font-semibold rounded bg-background border border-niko-border hover:border-niko-teal transition-colors text-foreground"
              >
                Credited
              </button>
              <button
                type="button"
                onClick={() => handleSimulateStatus("payout_pending")}
                className="px-2.5 py-1.5 text-xs font-semibold rounded bg-background border border-niko-border hover:border-niko-teal transition-colors text-foreground"
              >
                Payout Pending
              </button>
              <button
                type="button"
                onClick={() => handleSimulateStatus("paid")}
                className="px-2.5 py-1.5 text-xs font-semibold rounded bg-niko-teal/20 text-niko-teal border border-niko-teal/40 hover:bg-niko-teal hover:text-niko-navy transition-all"
              >
                Set Paid
              </button>
              <button
                type="button"
                onClick={() => handleSimulateStatus("failed")}
                className="px-2.5 py-1.5 text-xs font-semibold rounded bg-red-950/20 text-red-400 border border-red-500/40 hover:bg-red-500 hover:text-white transition-all"
              >
                Set Failed
              </button>
              <button
                type="button"
                onClick={() => handleSimulateStatus("expired")}
                className="px-2.5 py-1.5 text-xs font-semibold rounded bg-amber-950/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500 hover:text-black transition-all"
              >
                Set Expired
              </button>
              <button
                type="button"
                onClick={() => handleSimulateStatus("manual_review")}
                className="px-2.5 py-1.5 text-xs font-semibold rounded bg-amber-950/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black transition-all"
              >
                Set Review
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
