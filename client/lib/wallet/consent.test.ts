import { describe, expect, it } from "vitest";
import { buildOfframpTypedData } from "@/lib/wallet/consent";
import type { PaymentIntent } from "@/lib/settlement/types";

const intent: PaymentIntent = {
  id: "cf81b9f1-95e7-4949-9b97-789e05a971f1",
  status: "awaiting_payment",
  chain: "base",
  walletAddress: "0xbb6073d4052f7e1178cc3ae8090715cbb8f911d8",
  msisdn: "250795107436",
  usdtAmount: 10.502363,
  rate: 1450,
  feePercent: 1.5,
  feeRwf: 228,
  netRwf: 15000,
  treasuryAddress: "0x0dfdb5bbaeece3871f826df1c6fe24a2772f5d38",
  expiresAt: "2026-08-18T12:00:00.000Z",
  createdAt: "2026-08-18T11:45:00.000Z",
  updatedAt: "2026-08-18T11:45:00.000Z",
};

describe("buildOfframpTypedData", () => {
  it("builds a base consent payload", () => {
    const typed = buildOfframpTypedData(intent);
    expect(typed?.primaryType).toBe("OfframpConsent");
    expect(typed?.domain.chainId).toBe(84532);
    expect(typed?.message.treasury).toBe(intent.treasuryAddress);
    expect(typed?.message.usdtAmount).toBe("10.502363 USDT");
    expect(typed?.message.recipientMomo).toBe("250795107436");
  });

  it("returns null when the chain token is not ready", () => {
    expect(buildOfframpTypedData({ ...intent, chain: "polygon" })).toBeNull();
  });
});
