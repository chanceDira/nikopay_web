import { describe, expect, it } from "vitest";
import { getWalletConnectProjectId } from "@/lib/wallet/walletconnect";

describe("getWalletConnectProjectId", () => {
  it("returns null when the public project id is unset", () => {
    const previous = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    try {
      delete process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      expect(getWalletConnectProjectId()).toBeNull();
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      } else {
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = previous;
      }
    }
  });
});
