import { describe, expect, it } from "vitest";
import { parseDepositEvent } from "@/lib/deposits";

const valid = {
  chain: "base",
  txHash: "0x" + "ab".repeat(32),
  logIndex: 0,
  fromAddress: "0x0000000000000000000000000000000000000001",
  toAddress: "0x0000000000000000000000000000000000000012",
  tokenAddress: "0x0000000000000000000000000000000000000002",
  amount: 20,
  blockNumber: 123,
};

describe("parseDepositEvent", () => {
  it("normalizes addresses and tx hash", () => {
    const result = parseDepositEvent({
      ...valid,
      txHash: "0x" + "AB".repeat(32),
      toAddress: "0x0000000000000000000000000000000000000012",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.event.txHash).toBe("0x" + "ab".repeat(32));
    expect(result.event.chain).toBe("base");
    expect(result.event.logIndex).toBe(0);
  });

  it("rejects a missing chain", () => {
    expect(parseDepositEvent({ ...valid, chain: "tron" }).ok).toBe(false);
  });

  it("rejects a fractional log index", () => {
    expect(parseDepositEvent({ ...valid, logIndex: 1.5 }).ok).toBe(false);
  });

  it("rejects a non-positive amount", () => {
    const result = parseDepositEvent({ ...valid, amount: 0 });
    expect(result.ok).toBe(false);
  });
});
