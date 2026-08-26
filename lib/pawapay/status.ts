import type {
  DomainPayoutStatus,
  PawapayPayoutStatus,
} from "@/lib/pawapay/types";

const PENDING_STATUSES = new Set<string>([
  "ACCEPTED",
  "PROCESSING",
  "IN_RECONCILIATION",
]);

export function mapPawapayPayoutStatus(
  value: unknown,
): DomainPayoutStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  const status = value.trim().toUpperCase();

  switch (status) {
    case "COMPLETED":
      return "successful";
    case "FAILED":
      return "failed";
    case "ENQUEUED":
      return "enqueued";
    default:
      if (PENDING_STATUSES.has(status)) {
        return "pending";
      }
      return null;
  }
}

export function isPawapayFinalStatus(value: unknown): boolean {
  const mapped = mapPawapayPayoutStatus(value);
  return mapped === "successful" || mapped === "failed";
}

export function asPawapayPayoutStatus(
  value: unknown,
): PawapayPayoutStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  switch (value.trim().toUpperCase()) {
    case "ACCEPTED":
      return "ACCEPTED";
    case "ENQUEUED":
      return "ENQUEUED";
    case "PROCESSING":
      return "PROCESSING";
    case "IN_RECONCILIATION":
      return "IN_RECONCILIATION";
    case "COMPLETED":
      return "COMPLETED";
    case "FAILED":
      return "FAILED";
    default:
      return null;
  }
}
