import { describe, expect, it } from "vitest";
import { buildPaidEmailContent } from "@/lib/notify/email";

describe("buildPaidEmailContent", () => {
  it("includes amount and status link", () => {
    const content = buildPaidEmailContent(
      {
        to: "ada@niko.pay",
        intentId: "11111111-1111-4111-8111-111111111111",
        netRwf: 10000,
        usdtAmount: 7.001575,
        msisdn: "46733123450",
        momoRef: "FIN-1",
      },
      "https://nikopay-mvp.vercel.app",
    );

    expect(content.subject).toBe("NikoPay payout confirmed");
    expect(content.text).toContain("10,000");
    expect(content.text).toContain(
      "https://nikopay-mvp.vercel.app/app/payments/11111111-1111-4111-8111-111111111111",
    );
    expect(content.text).toContain("FIN-1");
  });
});
