import { describe, expect, it } from "vitest";
import { isMomoPayoutStatus, toAdminPayout } from "@/lib/admin-payouts";
import type { MomoTransferRow } from "@/lib/supabase/types";

function row(overrides: Partial<MomoTransferRow> = {}): MomoTransferRow {
  return {
    id: "tr-1",
    intent_id: "intent-1",
    reference_id: "ref-1",
    amount_rwf: 28565,
    msisdn: "250795107436",
    status: "successful",
    provider_ref: "FIN-99",
    created_at: "2026-08-18T16:00:00.000Z",
    updated_at: "2026-08-18T16:01:00.000Z",
    ...overrides,
  };
}

describe("toAdminPayout", () => {
  it("maps a momo transfer including the provider receipt", () => {
    expect(toAdminPayout(row())).toEqual({
      id: "tr-1",
      intentId: "intent-1",
      referenceId: "ref-1",
      amountRwf: 28565,
      msisdn: "250795107436",
      status: "successful",
      providerRef: "FIN-99",
      createdAt: "2026-08-18T16:00:00.000Z",
      updatedAt: "2026-08-18T16:01:00.000Z",
    });
  });

  it("rejects a non-numeric amount", () => {
    expect(toAdminPayout(row({ amount_rwf: Number.NaN }))).toBeNull();
  });
});

describe("isMomoPayoutStatus", () => {
  it("accepts provider statuses only", () => {
    expect(isMomoPayoutStatus("successful")).toBe(true);
    expect(isMomoPayoutStatus("paid")).toBe(false);
  });
});
