import { describe, expect, it } from "vitest";
import { transfersToTreasury } from "@/lib/observe-deposit";
import { topicForAddress, TRANSFER_TOPIC } from "@/lib/transfer-log";

const FROM = "0x0000000000000000000000000000000000000001";
const TREASURY = "0x0000000000000000000000000000000000000012";
const OTHER = "0x0000000000000000000000000000000000000099";
const TOKEN = "0x0000000000000000000000000000000000000002";
const OTHER_TOKEN = "0x0000000000000000000000000000000000000003";
const TX = "0x" + "ab".repeat(32);

function transferLog(input: {
  token?: string;
  from?: string;
  to?: string;
  data?: string;
  logIndex?: string;
}) {
  return {
    address: input.token ?? TOKEN,
    topics: [
      TRANSFER_TOPIC,
      topicForAddress(input.from ?? FROM),
      topicForAddress(input.to ?? TREASURY),
    ],
    data: input.data ?? "0x6ad5e7",
    transactionHash: TX,
    logIndex: input.logIndex ?? "0x58",
    blockNumber: "0x2b861ea",
  };
}

describe("transfersToTreasury", () => {
  it("keeps usdt transfers to treasury", () => {
    expect(
      transfersToTreasury(
        { status: "0x1", logs: [transferLog({})] },
        TX,
        TOKEN,
        TREASURY,
        6,
      ),
    ).toEqual([
      {
        txHash: TX,
        logIndex: 88,
        fromAddress: FROM,
        toAddress: TREASURY,
        tokenAddress: TOKEN,
        amount: 7.001575,
        blockNumber: 45638122,
      },
    ]);
  });

  it("ignores other tokens and destinations", () => {
    expect(
      transfersToTreasury(
        {
          status: "0x1",
          logs: [
            transferLog({ token: OTHER_TOKEN }),
            transferLog({ to: OTHER }),
          ],
        },
        TX,
        TOKEN,
        TREASURY,
        6,
      ),
    ).toEqual([]);
  });

  it("uses the provided hash when the log omits it", () => {
    const log = transferLog({});
    expect(
      transfersToTreasury(
        { status: "0x1", logs: [{ ...log, transactionHash: undefined }] },
        TX,
        TOKEN,
        TREASURY,
        6,
      )[0]?.txHash,
    ).toBe(TX);
  });
});
