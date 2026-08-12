import { canTransition } from "@/lib/settlement/transitions";
import type {
  PaymentStatus,
  TransitionActor,
  TransitionResult,
} from "@/lib/settlement/types";
import { PAYMENT_STATUSES } from "@/lib/settlement/types";

const TERMINAL_STATUSES = new Set<PaymentStatus>(["paid", "failed", "expired"]);

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    typeof value === "string" &&
    (PAYMENT_STATUSES as readonly string[]).includes(value)
  );
}

export function isTerminalStatus(status: PaymentStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function transitionStatus(
  from: PaymentStatus,
  to: PaymentStatus,
  actor: TransitionActor = "system",
) : TransitionResult {
  if (from === to) {
    return {
      ok: false,
      from,
      to,
      reason: "status is unchanged",
    };
  }

  if (!canTransition(from, to, actor)) {
    return {
      ok: false,
      from,
      to,
      reason: `cannot transition from ${from} to ${to} as ${actor}`,
    };
  }

  return { ok: true, from, to };
}

export function assertTransition(
  from: PaymentStatus,
  to: PaymentStatus,
  actor: TransitionActor = "system",
) : void {
  const result = transitionStatus(from, to, actor);
  if (!result.ok) {
    throw new IntentTransitionError(from, to, result.reason);
  }
}

export class IntentTransitionError extends Error {
  readonly from: PaymentStatus;
  readonly to: PaymentStatus;

  constructor(from: PaymentStatus, to: PaymentStatus, message: string) {
    super(message);
    this.name = "IntentTransitionError";
    this.from = from;
    this.to = to;
  }
}
