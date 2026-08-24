import { describe, expect, it } from "vitest";
import { parseScanChain } from "@/lib/scan-deposits";

describe("parseScanChain", () => {
  it("allows a missing chain to mean both", () => {
    expect(parseScanChain(null)).toEqual({ ok: true });
  });

  it("accepts polygon or base", () => {
    expect(parseScanChain("base")).toEqual({ ok: true, chain: "base" });
  });

  it("rejects an unknown chain", () => {
    expect(parseScanChain("tron").ok).toBe(false);
  });
});
