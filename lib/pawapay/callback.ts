import { asRecord, isUuid } from "@/lib/http";
import {
  asPawapayPayoutStatus,
  mapPawapayPayoutStatus,
} from "@/lib/pawapay/status";
import type { DomainPayoutStatus } from "@/lib/pawapay/types";
import {
  loadPayoutTransfer,
  updatePayoutTransfer,
} from "@/lib/pawapay/transfers";

const TERMINAL = new Set<DomainPayoutStatus>(["successful", "failed"]);

export type CallbackStore = {
  getTransfer: typeof loadPayoutTransfer;
  updateTransfer: typeof updatePayoutTransfer;
};

export type CallbackOutcome = {
  payoutId: string;
  status: DomainPayoutStatus;
  applied: boolean;
};

export type ParsedCallback = {
  payoutId: string;
  status: DomainPayoutStatus;
  providerRef: string | null;
  providerReason: string | null;
};

export function parsePayoutCallback(body: unknown): ParsedCallback | null {
  const record = asRecord(body);
  const payoutId = record?.payoutId;
  if (typeof payoutId !== "string" || !isUuid(payoutId)) {
    return null;
  }

  if (!asPawapayPayoutStatus(record?.status)) {
    return null;
  }
  const status = mapPawapayPayoutStatus(record?.status);
  if (!status) {
    return null;
  }

  const failureReason = asRecord(record?.failureReason);

  return {
    payoutId,
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

export function parsePayoutStatusBody(body: unknown): ParsedCallback | null {
  const record = asRecord(body);
  if (!record) {
    return null;
  }

  const search =
    typeof record.status === "string" ? record.status.trim().toUpperCase() : "";
  if (search === "FOUND") {
    return parsePayoutCallback(record.data);
  }

  return parsePayoutCallback(record);
}

export async function applyPayoutCallback(
  body: unknown,
  callbackStore?: CallbackStore,
): Promise<
  { ok: true; outcome: CallbackOutcome } | { ok: false; reason: string }
> {
  const store = callbackStore ?? {
    getTransfer: loadPayoutTransfer,
    updateTransfer: updatePayoutTransfer,
  };

  const parsed = parsePayoutStatusBody(body);
  if (!parsed) {
    return { ok: false, reason: "callback payload is invalid" };
  }

  const existing = await store.getTransfer(parsed.payoutId);
  if (!existing.ok) {
    return existing;
  }
  if (!existing.row) {
    return { ok: false, reason: "payout not found" };
  }

  if (TERMINAL.has(existing.row.status)) {
    return {
      ok: true,
      outcome: {
        payoutId: parsed.payoutId,
        status: existing.row.status,
        applied: false,
      },
    };
  }

  const updated = await store.updateTransfer(parsed.payoutId, {
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
      payoutId: parsed.payoutId,
      status: updated.applied ? parsed.status : existing.row.status,
      applied: updated.applied,
    },
  };
}
