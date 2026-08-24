import { describe, expect, it } from "vitest";
import {
  confirmedHead,
  nextScanRange,
  hexQuantityToTokenAmount,
  parseTransferLog,
  rawTokenToUsdt,
  topicForAddress,
  TRANSFER_TOPIC,
} from "@/lib/transfer-log";

const FROM = "0x0000000000000000000000000000000000000001";
const TO = "0x0000000000000000000000000000000000000012";
const TOKEN = "0x0000000000000000000000000000000000000002";
const TX = "0x" + "ab".repeat(32);

describe("rawTokenToUsdt", () => {
  it("converts 6-decimal USDT base units", () => {
    expect(rawTokenToUsdt("0x1312d00", 6)).toBe(20);
    expect(
      rawTokenToUsdt(
        "0x0000000000000000000000000000000000000000000000000000000001312d00",
        6,
      ),
    ).toBe(20);
  });

  it("rejects zero", () => {
    expect(rawTokenToUsdt("0x0", 6)).toBeNull();
  });
});

describe("hexQuantityToTokenAmount", () => {
  it("allows a zero balance", () => {
    expect(hexQuantityToTokenAmount("0x0", 6)).toBe(0);
    expect(hexQuantityToTokenAmount("0x1312d00", 6)).toBe(20);
  });
});

describe("topicForAddress", () => {
  it("left-pads a 20-byte address", () => {
    expect(topicForAddress(TO)).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000012",
    );
  });
});

describe("parseTransferLog", () => {
  it("parses a Transfer log into ingest fields", () => {
    const parsed = parseTransferLog(
      {
        address: TOKEN,
        topics: [TRANSFER_TOPIC, topicForAddress(FROM), topicForAddress(TO)],
        data: "0x1312d00",
        transactionHash: TX,
        logIndex: "0x0",
        blockNumber: "0xa",
      },
      6,
    );

    expect(parsed).toEqual({
      txHash: TX,
      logIndex: 0,
      fromAddress: FROM,
      toAddress: TO,
      tokenAddress: TOKEN,
      amount: 20,
      blockNumber: 10,
    });
  });

  it("skips removed logs", () => {
    expect(
      parseTransferLog(
        {
          address: TOKEN,
          topics: [TRANSFER_TOPIC, topicForAddress(FROM), topicForAddress(TO)],
          data: "0x1312d00",
          transactionHash: TX,
          logIndex: "0x0",
          blockNumber: "0xa",
          removed: true,
        },
        6,
      ),
    ).toBeNull();
  });
});

describe("scan range", () => {
  it("waits until the head is confirmed", () => {
    expect(confirmedHead(100, 2)).toBe(98);
    expect(
      nextScanRange({ lastBlock: 98, confirmedHead: 98, maxSpan: 50 }),
    ).toBeNull();
  });

  it("caps the span", () => {
    expect(
      nextScanRange({ lastBlock: 10, confirmedHead: 100, maxSpan: 20 }),
    ).toEqual({ fromBlock: 11, toBlock: 30 });
  });
});
