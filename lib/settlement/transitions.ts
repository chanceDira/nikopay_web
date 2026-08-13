import type { PaymentStatus, TransitionActor } from "@/lib/settlement/types";

const SYSTEM_TRANSITIONS: Readonly<
  Record<PaymentStatus, readonly PaymentStatus[]>
> = {
  awaiting_payment: ["detected", "expired", "manual_review"],
  detected: ["credited", "manual_review"],
  credited: ["payout_pending", "failed", "manual_review"],
  payout_pending: ["paid", "failed", "manual_review"],
  paid: [],
  failed: [],
  expired: [],
  manual_review: [],
};

const ADMIN_TRANSITIONS: Readonly<
  Record<PaymentStatus, readonly PaymentStatus[]>
> = {
  awaiting_payment: [],
  detected: [],
  credited: [],
  payout_pending: [],
  paid: [],
  failed: ["payout_pending", "manual_review"],
  expired: ["manual_review"],
  manual_review: ["credited", "payout_pending", "failed", "expired"],
};

export function allowedTransitions(
  from: PaymentStatus,
  actor: TransitionActor = "system",
): readonly PaymentStatus[] {
  if (actor === "admin") {
    return uniqueStatuses([
      ...SYSTEM_TRANSITIONS[from],
      ...ADMIN_TRANSITIONS[from],
    ]);
  }

  return SYSTEM_TRANSITIONS[from];
}

export function canTransition(
  from: PaymentStatus,
  to: PaymentStatus,
  actor: TransitionActor = "system",
): boolean {
  if (from === to) {
    return false;
  }

  return allowedTransitions(from, actor).includes(to);
}

function uniqueStatuses(statuses: readonly PaymentStatus[]): PaymentStatus[] {
  return [...new Set(statuses)];
}
