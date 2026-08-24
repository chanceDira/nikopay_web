import { describe, expect, it } from "vitest";
import {
  encodeErc20BalanceOf,
  encodeErc20Transfer,
  usdtToTokenUnits,
} from "@/lib/wallet/encoding";

describe("usdtToTokenUnits", () => {
  it("converts 6-decimal amounts without float drift", () => {
    expect(usdtToTokenUnits(10.502363, 6)).toBe(BigInt(10502363));
    expect(usdtToTokenUnits(10, 6)).toBe(BigInt(10000000));
  });

  it("rejects invalid amounts", () => {
    expect(usdtToTokenUnits(0, 6)).toBeNull();
    expect(usdtToTokenUnits(-1, 6)).toBeNull();
    expect(usdtToTokenUnits(10, 1.5)).toBeNull();
  });
});

describe("encodeErc20Transfer", () => {
  it("encodes transfer(address,uint256)", () => {
    const encoded = encodeErc20Transfer(
      "0x0dfdb5bbaeece3871f826df1c6fe24a2772f5d38",
      BigInt(10502363),
    );
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) {
      return;
    }
    expect(encoded.data).toBe(
      "0xa9059cbb0000000000000000000000000dfdb5bbaeece3871f826df1c6fe24a2772f5d380000000000000000000000000000000000000000000000000000000000a040db",
    );
  });

  it("rejects a bad treasury address", () => {
    expect(encodeErc20Transfer("0xabc", BigInt(1)).ok).toBe(false);
  });
});

describe("encodeErc20BalanceOf", () => {
  it("encodes balanceOf(address)", () => {
    const encoded = encodeErc20BalanceOf(
      "0x0dfdb5bbaeece3871f826df1c6fe24a2772f5d38",
    );
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) {
      return;
    }
    expect(encoded.data).toBe(
      "0x70a082310000000000000000000000000dfdb5bbaeece3871f826df1c6fe24a2772f5d38",
    );
  });
});
