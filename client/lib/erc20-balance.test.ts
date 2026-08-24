import { describe, expect, it } from "vitest";
import { isQueryableToken } from "@/lib/erc20-balance";

describe("isQueryableToken", () => {
  it("rejects the polygon placeholder and the zero address", () => {
    expect(isQueryableToken("0x0000000000000000000000000000000000000001")).toBe(
      false,
    );
    expect(isQueryableToken("0x0000000000000000000000000000000000000000")).toBe(
      false,
    );
  });

  it("accepts the base sepolia test usdt", () => {
    expect(isQueryableToken("0x976691A612095Be4C84f255732cCf14f19800479")).toBe(
      true,
    );
  });
});
