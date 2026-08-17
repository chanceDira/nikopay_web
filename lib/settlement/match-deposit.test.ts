import { describe, expect, it } from "vitest";
import {
  matchDeposit,
  type MatchableIntent,
} from "@/lib/settlement/match-deposit";
import type { ChainId } from "@/lib/settlement/types";

const NOW = new Date("2026-08-17T14:00:00.000Z");
const LIVE = "2026-08-17T15:00:00.000Z";
const PAST = "2026-08-17T13:00:00.000Z";
const TREASURY = "0x0000000000000000000000000000000000000012";
const OTHER = "0x0000000000000000000000000000000000000099";

function intent(
  id: string,
  overrides: Partial<MatchableIntent> = {},
) : MatchableIntent {
  return {
    id,
    status: "awaiting_payment",
    chain: "base",
    treasuryAddress: TREASURY,
    usdtAmount: 20,
    expiresAt: LIVE,
    ...overrides,
  };
}

function deposit(
  overrides: { chain?: ChainId; toAddress?: string; amount?: number } = {},
) {
  return {
    chain: "base" as const,
    toAddress: TREASURY,
    amount: 20,
    ...overrides,
  };
}

describe("matchDeposit", () => {
  it("credits a unique exact live match", () => {
    expect(
      matchDeposit(
        deposit(),
        [intent("a"), intent("b", { usdtAmount: 50 })],
        NOW,
      ),
    ).toEqual({ outcome: "credited", intentId: "a" });
  });

  it("treats mixed-case treasury as the same address", () => {
    expect(
      matchDeposit(
        deposit({ toAddress: TREASURY.toUpperCase() }),
        [
          intent("a", {
            treasuryAddress: "0x0000000000000000000000000000000000000012",
          }),
        ],
        NOW,
      ),
    ).toEqual({ outcome: "credited", intentId: "a" });
  });

  it("sends duplicate exact matches to manual review", () => {
    expect(matchDeposit(deposit(), [intent("a"), intent("b")], NOW)).toEqual({
      outcome: "manual_review",
      intentIds: ["a", "b"],
    });
  });

  it("sends a single open intent with the wrong amount to manual review", () => {
    expect(matchDeposit(deposit({ amount: 19 }), [intent("a")], NOW)).toEqual({
      outcome: "manual_review",
      intentIds: ["a"],
    });
  });

  it("does not guess when several open intents all have the wrong amount", () => {
    expect(
      matchDeposit(
        deposit({ amount: 30 }),
        [intent("a"), intent("b", { usdtAmount: 50 })],
        NOW,
      ),
    ).toEqual({ outcome: "unmatched" });
  });

  it("ignores intents on another chain or treasury", () => {
    expect(
      matchDeposit(
        deposit(),
        [
          intent("poly", { chain: "polygon" }),
          intent("other", { treasuryAddress: OTHER }),
        ],
        NOW,
      ),
    ).toEqual({ outcome: "unmatched" });
  });

  it("ignores intents that are not awaiting payment", () => {
    expect(
      matchDeposit(deposit(), [intent("a", { status: "credited" })], NOW),
    ).toEqual({ outcome: "unmatched" });
  });

  it("expires a unique exact match that is past expiry", () => {
    expect(
      matchDeposit(deposit(), [intent("a", { expiresAt: PAST })], NOW),
    ).toEqual({ outcome: "expired", intentIds: ["a"] });
  });

  it("credits a live exact match and leaves an expired duplicate alone", () => {
    expect(
      matchDeposit(
        deposit(),
        [intent("live"), intent("old", { expiresAt: PAST })],
        NOW,
      ),
    ).toEqual({ outcome: "credited", intentId: "live" });
  });

  it("does not expire wrong-amount intents just because a deposit arrived", () => {
    expect(
      matchDeposit(
        deposit({ amount: 20 }),
        [intent("a", { usdtAmount: 50, expiresAt: PAST })],
        NOW,
      ),
    ).toEqual({ outcome: "unmatched" });
  });
});
