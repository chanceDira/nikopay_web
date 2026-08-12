import type { PaymentIntent, PaymentStatus } from "@/lib/settlement/types";

type ExpirableIntent = Pick<PaymentIntent, "status" | "expiresAt">;

export function parseInstant(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`invalid timestamp: ${value}`);
  }
  return date;
}

export function isPastExpiry(
  expiresAt: string,
  now: Date = new Date(),
) : boolean {
  return parseInstant(expiresAt).getTime() <= now.getTime();
}

export function shouldExpireIntent(
  intent: ExpirableIntent,
  now: Date = new Date(),
) : boolean {
  return (
    intent.status === "awaiting_payment" && isPastExpiry(intent.expiresAt, now)
  );
}

export function statusAfterExpiryCheck(
  intent: ExpirableIntent,
  now: Date = new Date(),
) : PaymentStatus {
  if (shouldExpireIntent(intent, now)) {
    return "expired";
  }
  return intent.status;
}
