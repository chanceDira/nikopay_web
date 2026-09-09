import { writeAdminAudit } from "@/lib/admin-audit";
import { failEnqueuedPayout } from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";
import { reconcilePayout } from "@/lib/pawapay/poll";
import { loadPayoutTransfer } from "@/lib/pawapay/transfers";

export async function cancelEnqueuedPayout(input: {
  payoutId: string;
  actor: string;
}): Promise<
  { ok: true; status: string } | { ok: false; reason: string; status: number }
> {
  const existing = await loadPayoutTransfer(input.payoutId);
  if (!existing.ok) {
    return { ok: false, reason: existing.reason, status: 503 };
  }
  if (!existing.row) {
    return { ok: false, reason: "payout not found", status: 404 };
  }
  if (existing.row.status !== "enqueued") {
    return {
      ok: false,
      reason: "payout is not enqueued",
      status: 409,
    };
  }

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return { ok: false, reason: configured.reason, status: 503 };
  }

  const cancelled = await failEnqueuedPayout(configured.config, input.payoutId);
  if (!cancelled.ok) {
    return { ok: false, reason: cancelled.reason, status: 503 };
  }
  if (cancelled.data.status === "REJECTED") {
    return {
      ok: false,
      reason:
        cancelled.data.failureReason?.failureCode ?? "unable to cancel payout",
      status: 409,
    };
  }

  const polled = await reconcilePayout(input.payoutId, configured.config);
  await writeAdminAudit({
    actor: input.actor,
    action: "fail_enqueued",
    intentId: existing.row.intent_id,
    payoutId: input.payoutId,
    fromStatus: existing.row.status,
    toStatus: polled?.status ?? "enqueued",
    detail: "MANUALLY_CANCELLED",
  });

  return { ok: true, status: polled?.status ?? "enqueued" };
}
