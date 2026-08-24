import { describe, expect, it } from "vitest";
import {
  isUuid,
  normalizeMsisdn,
  normalizeOptionalEmail,
  normalizeTxHash,
  normalizeWalletAddress,
} from "@/lib/identity";

describe("normalizeWalletAddress", () => {
  it("lowercases a valid address", () => {
    const result = normalizeWalletAddress(
      "0xAbCDef0000000000000000000000000000000001",
    );

    expect(result).toEqual({
      ok: true,
      address: "0xabcdef0000000000000000000000000000000001",
    });
  });

  it("rejects a short address", () => {
    expect(normalizeWalletAddress("0xabc").ok).toBe(false);
  });
});

describe("normalizeTxHash", () => {
  it("lowercases a valid tx hash", () => {
    const hash = "0x" + "Ab".repeat(32);
    const result = normalizeTxHash(hash);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.txHash).toBe(hash.toLowerCase());
  });

  it("rejects a short hash", () => {
    expect(normalizeTxHash("0xabc").ok).toBe(false);
  });
});

describe("normalizeMsisdn", () => {
  it("normalizes local 07 numbers to 2507", () => {
    expect(normalizeMsisdn("0788123456")).toEqual({
      ok: true,
      msisdn: "250788123456",
    });
  });

  it("accepts +250 formatted input", () => {
    expect(normalizeMsisdn("+250 788 123 456")).toEqual({
      ok: true,
      msisdn: "250788123456",
    });
  });

  it("accepts international E.164 numbers for sandbox and multi-country", () => {
    expect(normalizeMsisdn("46733123450")).toEqual({
      ok: true,
      msisdn: "46733123450",
    });
    expect(normalizeMsisdn("+254 700 000 000")).toEqual({
      ok: true,
      msisdn: "254700000000",
    });
  });

  it("rejects too-short numbers", () => {
    expect(normalizeMsisdn("12345").ok).toBe(false);
  });
});

describe("normalizeOptionalEmail", () => {
  it("accepts empty as null", () => {
    expect(normalizeOptionalEmail("")).toEqual({ ok: true, email: null });
    expect(normalizeOptionalEmail(undefined)).toEqual({
      ok: true,
      email: null,
    });
  });

  it("normalizes email", () => {
    expect(normalizeOptionalEmail("  Ada@Niko.Pay ")).toEqual({
      ok: true,
      email: "ada@niko.pay",
    });
  });

  it("rejects invalid email", () => {
    expect(normalizeOptionalEmail("not-an-email").ok).toBe(false);
  });
});

describe("isUuid", () => {
  it("accepts a v4 uuid", () => {
    expect(isUuid("2d15c261-b5a3-4052-9b56-bed860e2f108")).toBe(true);
  });

  it("rejects mock fixture ids", () => {
    expect(isUuid("tx-7392a")).toBe(false);
  });
});
