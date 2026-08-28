import { describe, expect, it } from "vitest";
import {
  buildFailedEmailContent,
  buildPaidEmailContent,
} from "@/lib/notify/email";

describe("buildPaidEmailContent", () => {
  it("includes payment details and chain + momo proofs", () => {
    const content = buildPaidEmailContent(
      {
        to: "ada@niko.pay",
        intentId: "11111111-1111-4111-8111-111111111111",
        netRwf: 10000,
        usdtAmount: 7.001575,
        feeRwf: 150,
        rate: 1450,
        msisdn: "46733123450",
        walletAddress: "0xabcdef0000000000000000000000000000000001",
        chain: "base",
        depositTx:
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        depositExplorerUrl:
          "https://sepolia.basescan.org/tx/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        momoRef: "FIN-1",
        momoFinancialId: "FIN-1",
        momoReferenceId: "22222222-2222-4222-8222-222222222222",
      },
      "https://nikopay.to",
    );

    expect(content.subject).toBe("NikoPay payout confirmed");
    expect(content.text).toContain("10,000");
    expect(content.text).toContain("Blockchain proof");
    expect(content.text).toContain("MoMo proof");
    expect(content.text).toContain("FIN-1");
    expect(content.text).toContain("sepolia.basescan.org");
    expect(content.text).toContain(
      "https://nikopay.to/app/payments/11111111-1111-4111-8111-111111111111",
    );
  });
});

describe("buildFailedEmailContent", () => {
  it("includes deposit proof and confirmed momo failure", () => {
    const content = buildFailedEmailContent(
      {
        to: "ada@niko.pay",
        intentId: "11111111-1111-4111-8111-111111111111",
        netRwf: 10000,
        usdtAmount: 7,
        msisdn: "250788123456",
        chain: "base",
        depositTx:
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        momoStatus: "failed",
        momoReferenceId: "33333333-3333-4333-8333-333333333333",
        providerReason: "LOW_BALANCE_OR_PAYEE_LIMIT_REACHED",
      },
      "https://nikopay.to",
    );

    expect(content.subject).toBe("NikoPay payout did not complete");
    expect(content.text).toContain("confirmed by MTN");
    expect(content.text).toContain("LOW_BALANCE_OR_PAYEE_LIMIT_REACHED");
    expect(content.text).toContain("Blockchain proof");
    expect(content.text).toContain("held while we review");
  });
});
