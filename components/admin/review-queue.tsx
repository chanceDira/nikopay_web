"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useAdminIntents } from "@/components/admin/use-admin-intents";
import { getPublicChain } from "@/lib/chain-config";
import { paginate } from "@/lib/paginate";
import { formatLocalAmount, formatExactUsdt } from "@/lib/rates";
import { displayPayoutRef } from "@/lib/payout-ref";
import { canTransition } from "@/lib/settlement/transitions";
import type {
  ChainId,
  PaymentIntent,
  PaymentStatus,
} from "@/lib/settlement/types";

const PAGE_SIZE = 5;

const REVIEW_STATUSES: PaymentStatus[] = [
  "awaiting_payment",
  "detected",
  "manual_review",
  "credited",
  "payout_pending",
];

const PATCH_HEADERS = {
  "Content-Type": "application/json",
};

export function AdminReviewQueue() {
  const { intents, loading, reload } = useAdminIntents();
  const [page, setPage] = useState(1);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const queue = intents.filter((intent) =>
    REVIEW_STATUSES.includes(intent.status),
  );
  const paged = paginate(queue, page, PAGE_SIZE);

  const patchStatus = async (intent: PaymentIntent, status: PaymentStatus) => {
    setSuccessMsg("");
    setErrorMsg("");

    const res = await fetch(`/api/admin/intents/${intent.id}`, {
      method: "PATCH",
      headers: PATCH_HEADERS,
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setErrorMsg(json.error ?? "Update failed.");
      return;
    }

    await reload();
    setSuccessMsg(
      `${intent.id.slice(0, 8)}... moved to ${status.replace(/_/g, " ")}.`,
    );
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  return (
    <div className="space-y-6">
      {successMsg ? (
        <div className="p-3 rounded-md bg-niko-teal/15 border border-niko-teal/20 text-niko-teal text-xs text-center">
          {successMsg}
        </div>
      ) : null}
      {errorMsg ? (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
          {errorMsg}
        </div>
      ) : null}

      <div className="niko-panel overflow-hidden">
        <div className="border-b border-niko-border/40 bg-niko-well/40 px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-foreground">
            Review queue
            <span className="ml-2 font-mono text-niko-teal">
              ({loading ? "…" : queue.length})
            </span>
          </h2>
          <p className="mt-1 text-xs text-niko-muted">
            Intents waiting on deposit or payout action
          </p>
        </div>

        <div className="p-4 sm:p-5">
          {loading && queue.length === 0 ? (
            <div className="flex justify-center py-10">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-niko-teal border-t-transparent" />
            </div>
          ) : queue.length === 0 ? (
            <p className="py-8 text-center text-sm text-niko-muted">
              Nothing to review.
            </p>
          ) : (
            <div className="space-y-3">
              {paged.items.map((item) => (
                <ReviewCard
                  key={item.id}
                  item={item}
                  confirmTarget={reviewConfirmTarget(item.status)}
                  failTarget={
                    canTransition(item.status, "failed", "admin")
                      ? "failed"
                      : null
                  }
                  onConfirm={(status) => void patchStatus(item, status)}
                  onFail={() => void patchStatus(item, "failed")}
                />
              ))}
              <PaginationBar
                page={paged.page}
                totalPages={paged.totalPages}
                total={paged.total}
                onPrev={() => setPage(paged.page - 1)}
                onNext={() => setPage(paged.page + 1)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function reviewConfirmTarget(status: PaymentStatus): PaymentStatus | null {
  if (canTransition(status, "credited", "admin")) {
    return "credited";
  }
  if (canTransition(status, "paid", "admin")) {
    return "paid";
  }
  return null;
}

function ReviewCard(props: {
  item: PaymentIntent;
  confirmTarget: PaymentStatus | null;
  failTarget: PaymentStatus | null;
  onConfirm: (status: PaymentStatus) => void;
  onFail: () => void;
}) {
  const { item, confirmTarget, failTarget } = props;
  const confirmLabel =
    confirmTarget === "credited" ? "Retry payout" : "Mark paid";

  return (
    <div className="flex flex-col gap-4 rounded-md border border-niko-border/40 bg-niko-well/30 p-4 transition-colors hover:border-niko-border/70 sm:p-5">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-sm font-semibold text-niko-teal">
            <Link
              href={`/admin/transactions/${item.id}`}
              className="hover:underline"
            >
              {item.id.slice(0, 8)}…
            </Link>
          </span>
          <span
            className={`rounded-md border px-2 py-0.5 font-mono text-[10px] capitalize ${
              item.status === "manual_review"
                ? "border-[var(--niko-warning-border)] bg-[var(--niko-warning-bg)] text-[var(--niko-warning-text)]"
                : "border-amber-500/25 bg-amber-500/10 text-amber-700"
            }`}
          >
            {item.status.replace(/_/g, " ")}
          </span>
          <span className="font-mono text-xs capitalize text-niko-muted">
            {item.chain}
          </span>
        </div>

        <div className="flex w-full gap-2 md:w-auto">
          {confirmTarget ? (
            <button
              type="button"
              onClick={() => props.onConfirm(confirmTarget)}
              className="flex-1 cursor-pointer rounded-md bg-niko-teal px-4 py-2 text-xs font-semibold text-niko-on-accent transition-colors hover:bg-niko-teal-bright md:flex-none"
            >
              {confirmLabel}
            </button>
          ) : null}
          {failTarget ? (
            <button
              type="button"
              onClick={props.onFail}
              className="px-3 py-2 border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-semibold rounded-md transition-all cursor-pointer"
            >
              Fail
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-xs font-mono">
        <Field label="USDT" value={formatExactUsdt(item.payUsdt)} />
        <Field
          label="Payout (net)"
          value={formatLocalAmount(item.netRwf, item.currency)}
          emphasis
        />
        <Field
          label="Fee"
          value={`${item.feePercent}% (${formatLocalAmount(item.feeRwf, item.currency)})`}
        />
        <Field label="Rate" value={`1 USDT = ${item.rate} ${item.currency}`} />
        <Field label="Recipient" value={item.msisdn} />
        <Field label="Payer wallet" value={shortHex(item.walletAddress)} />
        <Field label="Treasury" value={shortHex(item.treasuryAddress)} />
        <Field label="Created" value={formatDate(item.createdAt)} sans />
        <Field label="Updated" value={formatDate(item.updatedAt)} sans />
        <Field label="Expires" value={formatDate(item.expiresAt)} sans />
        <Field
          label="Deposit tx"
          value={
            item.depositTx ? (
              <ExplorerLink chain={item.chain} txHash={item.depositTx} />
            ) : (
              "—"
            )
          }
        />
        <Field label="Payout ref" value={displayPayoutRef(item) || "—"} />
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
  sans?: boolean;
}) {
  return (
    <div>
      <span className="text-niko-muted block">{props.label}</span>
      <span
        className={`${props.emphasis ? "text-niko-teal-bright font-semibold" : "text-foreground"} ${props.sans ? "font-sans" : ""}`}
      >
        {props.value}
      </span>
    </div>
  );
}

function ExplorerLink(props: { chain: ChainId; txHash: string }) {
  const base = getPublicChain(props.chain).blockExplorerUrls[0];
  const href = `${base}/tx/${props.txHash}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={props.txHash}
      className="text-niko-teal hover:underline"
    >
      {shortHex(props.txHash)}
    </a>
  );
}

function PaginationBar(props: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-niko-border/20">
      <p className="text-[11px] font-mono text-niko-muted">
        Page {props.page} of {props.totalPages} ({props.total} open)
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={props.page <= 1}
          onClick={props.onPrev}
          className="px-3 py-1.5 border border-niko-border text-xs font-semibold rounded-md text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-niko-surface/50 transition-all cursor-pointer"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={props.page >= props.totalPages}
          onClick={props.onNext}
          className="px-3 py-1.5 border border-niko-border text-xs font-semibold rounded-md text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-niko-surface/50 transition-all cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function shortHex(value: string): string {
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
