import { describe, expect, it } from "vitest";
import { sameWalletAddress, shortAddress } from "@/lib/wallet-session";

describe("sameWalletAddress", () => {
  it("matches case-insensitively", () => {
    expect(
      sameWalletAddress(
        "0xBb6073d4052F7e1178Cc3ae8090715cBb8f911d8",
        "0xbb6073d4052f7e1178cc3ae8090715cbb8f911d8",
      ),
    ).toBe(true);
  });

  it("rejects different addresses", () => {
    expect(
      sameWalletAddress(
        "0xbb6073d4052f7e1178cc3ae8090715cbb8f911d8",
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(false);
  });

  it("rejects empty values", () => {
    expect(sameWalletAddress("", "0xbb60")).toBe(false);
    expect(sameWalletAddress(null, "0xbb60")).toBe(false);
  });
});

describe("shortAddress", () => {
  it("truncates long addresses", () => {
    expect(shortAddress("0xbb6073d4052f7e1178cc3ae8090715cbb8f911d8")).toBe(
      "0xbb60...11d8",
    );
  });
});
