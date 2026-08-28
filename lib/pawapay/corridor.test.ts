import { describe, expect, it } from "vitest";
import { pickPayoutCorridor } from "@/lib/pawapay/corridor";

const rwandaConf = {
  countries: [
    {
      country: "RWA",
      providers: [
        {
          provider: "MTN_MOMO_RWA",
          currencies: [
            {
              currency: "RWF",
              operationTypes: [
                {
                  operationType: "PAYOUT",
                  minTransactionLimit: "1",
                  maxTransactionLimit: "100000",
                  decimalsInAmount: "NONE",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("pickPayoutCorridor", () => {
  it("reads PAYOUT limits from active-conf", () => {
    expect(
      pickPayoutCorridor(rwandaConf, {
        country: "RWA",
        provider: "MTN_MOMO_RWA",
      }),
    ).toEqual({
      country: "RWA",
      provider: "MTN_MOMO_RWA",
      currency: "RWF",
      decimalsInAmount: "NONE",
      minAmount: "1",
      maxAmount: "100000",
    });
  });

  it("returns null when the provider has no payout op", () => {
    expect(
      pickPayoutCorridor(rwandaConf, {
        country: "RWA",
        provider: "AIRTEL_RWA",
      }),
    ).toBeNull();
  });
});
