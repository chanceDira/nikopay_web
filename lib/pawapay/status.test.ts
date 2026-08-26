import { describe, expect, it } from "vitest";
import {
  asPawapayPayoutStatus,
  isPawapayFinalStatus,
  mapPawapayPayoutStatus,
} from "@/lib/pawapay/status";

describe("mapPawapayPayoutStatus", () => {
  it("maps final and in-flight statuses", () => {
    expect(mapPawapayPayoutStatus("COMPLETED")).toBe("successful");
    expect(mapPawapayPayoutStatus("FAILED")).toBe("failed");
    expect(mapPawapayPayoutStatus("ENQUEUED")).toBe("enqueued");
    expect(mapPawapayPayoutStatus("ACCEPTED")).toBe("pending");
    expect(mapPawapayPayoutStatus("PROCESSING")).toBe("pending");
    expect(mapPawapayPayoutStatus("IN_RECONCILIATION")).toBe("pending");
  });

  it("is case-insensitive and rejects unknown values", () => {
    expect(mapPawapayPayoutStatus("completed")).toBe("successful");
    expect(mapPawapayPayoutStatus("SUBMITTED")).toBeNull();
    expect(mapPawapayPayoutStatus(null)).toBeNull();
  });
});

describe("isPawapayFinalStatus", () => {
  it("treats only COMPLETED and FAILED as final", () => {
    expect(isPawapayFinalStatus("COMPLETED")).toBe(true);
    expect(isPawapayFinalStatus("FAILED")).toBe(true);
    expect(isPawapayFinalStatus("ENQUEUED")).toBe(false);
    expect(isPawapayFinalStatus("ACCEPTED")).toBe(false);
  });
});

describe("asPawapayPayoutStatus", () => {
  it("narrows known status strings", () => {
    expect(asPawapayPayoutStatus("PROCESSING")).toBe("PROCESSING");
    expect(asPawapayPayoutStatus("nope")).toBeNull();
  });
});
