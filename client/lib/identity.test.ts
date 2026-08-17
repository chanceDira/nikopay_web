import { describe, expect, it } from "vitest";
import {
  normalizeMsisdn,
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

  it("rejects non-Rwanda numbers", () => {
    expect(normalizeMsisdn("254700000000").ok).toBe(false);
  });
});
