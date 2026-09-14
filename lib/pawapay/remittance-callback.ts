import { asRecord, isUuid } from "@/lib/http";
import {
  applyRemittanceUpdate,
  mapRemittanceCallbackStatus,
} from "@/lib/remittances";
import { asPawapayPayoutStatus } from "@/lib/pawapay/status";

export type RemittanceCallbackOutcome = {
  remittanceId: string;
  status: string;
  applied: boolean;
};

export function parseRemittanceCallback(body: unknown): {
  remittanceId: string;
  status: NonNullable<ReturnType<typeof mapRemittanceCallbackStatus>>;
  providerRef: string | null;
  providerReason: string | null;
} | null {
  const record = asRecord(body);
  const remittanceId = record?.remittanceId;
  if (typeof remittanceId !== "string" || !isUuid(remittanceId)) {
    return null;
  }

  if (!asPawapayPayoutStatus(record?.status)) {
    return null;
  }
  const status = mapRemittanceCallbackStatus(record?.status);
  if (!status) {
    return null;
  }

  const failureReason = asRecord(record?.failureReason);

  return {
    remittanceId,
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

export function parseRemittanceStatusBody(
  body: unknown,
): ReturnType<typeof parseRemittanceCallback> {
  const record = asRecord(body);
  if (!record) {
    return null;
  }

  const search =
    typeof record.status === "string" ? record.status.trim().toUpperCase() : "";
  if (search === "FOUND") {
    return parseRemittanceCallback(record.data);
  }

  return parseRemittanceCallback(record);
}

export async function applyRemittanceCallback(
  body: unknown,
): Promise<
  | { ok: true; outcome: RemittanceCallbackOutcome }
  | { ok: false; reason: string }
> {
  const parsed = parseRemittanceStatusBody(body);
  if (!parsed) {
    return { ok: false, reason: "callback payload is invalid" };
  }

  const updated = await applyRemittanceUpdate({
    remittanceId: parsed.remittanceId,
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
      remittanceId: parsed.remittanceId,
      status: updated.status,
      applied: updated.applied,
    },
  };
}
