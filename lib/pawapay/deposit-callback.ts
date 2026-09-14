import { asRecord, isUuid } from "@/lib/http";
import {
  applyDepositCollectionUpdate,
  mapDepositCallbackStatus,
} from "@/lib/collections";
import { asPawapayPayoutStatus } from "@/lib/pawapay/status";

export type DepositCallbackOutcome = {
  depositId: string;
  status: string;
  applied: boolean;
};

export function parseDepositCallback(body: unknown): {
  depositId: string;
  status: NonNullable<ReturnType<typeof mapDepositCallbackStatus>>;
  providerRef: string | null;
  providerReason: string | null;
} | null {
  const record = asRecord(body);
  const depositId = record?.depositId;
  if (typeof depositId !== "string" || !isUuid(depositId)) {
    return null;
  }

  if (!asPawapayPayoutStatus(record?.status)) {
    return null;
  }
  const status = mapDepositCallbackStatus(record?.status);
  if (!status) {
    return null;
  }

  const failureReason = asRecord(record?.failureReason);

  return {
    depositId,
    status,
    providerRef:
      typeof record?.providerTransactionId === "string"
        ? record.providerTransactionId
        : null,
    providerReason:
      typeof failureReason?.failureCode === "string"
        ? failureReason.failureCode
        : null,
  };
}

export function parseDepositStatusBody(
  body: unknown,
): ReturnType<typeof parseDepositCallback> {
  const record = asRecord(body);
  if (!record) {
    return null;
  }

  const search =
    typeof record.status === "string" ? record.status.trim().toUpperCase() : "";
  if (search === "FOUND") {
    return parseDepositCallback(record.data);
  }

  return parseDepositCallback(record);
}

export async function applyDepositCallback(
  body: unknown,
): Promise<
  { ok: true; outcome: DepositCallbackOutcome } | { ok: false; reason: string }
> {
  const parsed = parseDepositStatusBody(body);
  if (!parsed) {
    return { ok: false, reason: "callback payload is invalid" };
  }

  const updated = await applyDepositCollectionUpdate({
    depositId: parsed.depositId,
    status: parsed.status,
    providerRef: parsed.providerRef,
    providerReason: parsed.providerReason,
  });
  if (!updated.ok) {
    return updated;
  }

  return {
    ok: true,
    outcome: {
      depositId: parsed.depositId,
      status: updated.status,
      applied: updated.applied,
    },
  };
}
