import { describe, expect, it } from "vitest";
import { asWalletKind } from "@/lib/wallet/browser";

describe("asWalletKind", () => {
  it("keeps known wallet names", () => {
    expect(asWalletKind("MetaMask")).toBe("MetaMask");
    expect(asWalletKind("Coinbase Wallet")).toBe("Coinbase Wallet");
    expect(asWalletKind("WalletConnect")).toBe("WalletConnect");
  });

  it("defaults unknown names to MetaMask", () => {
    expect(asWalletKind("")).toBe("MetaMask");
    expect(asWalletKind("Rainbow")).toBe("MetaMask");
  });
});
