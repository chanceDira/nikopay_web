import { describe, expect, it } from "vitest";
import {
  isAborted,
  isPaymentIntentPayload,
  isQuotePayload,
  parseApiPayload,
} from "@/lib/pay-api";
import type { PaymentIntent, Quote } from "@/lib/settlement/types";

const quote: Quote = {
  usdtAmount: 20,
  rate: 1450,
  feePercent: 1.5,
  feeRwf: 435,
  netRwf: 28565,
  chain: "polygon",
  expiresAt: "2026-08-18T12:00:00.000Z",
};

const intent: PaymentIntent = {
  id: "2d15c261-b5a3-4052-9b56-bed860e2f108",
  status: "awaiting_payment",
  chain: "polygon",
  walletAddress: "0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
  msisdn: "250788123456",
  usdtAmount: 20,
  rate: 1450,
  feePercent: 1.5,
  feeRwf: 435,
  netRwf: 28565,
  treasuryAddress: "0x0dfdb5bbaeece3871f826df1c6fe24a2772f5d38",
  expiresAt: "2026-08-18T12:00:00.000Z",
  createdAt: "2026-08-18T11:45:00.000Z",
  updatedAt: "2026-08-18T11:45:00.000Z",
};

describe("parseApiPayload", () => {
  it("returns data on success", () => {
    expect(parseApiPayload(201, { data: quote }, isQuotePayload)).toEqual({
      ok: true,
      data: quote,
    });
  });

  it("returns the server error string", () => {
    expect(
      parseApiPayload(
        400,
        { error: "usdt amount must be at least 5" },
        isQuotePayload,
      ),
    ).toEqual({
      ok: false,
      reason: "usdt amount must be at least 5",
      status: 400,
    });
  });

  it("rejects a success envelope with a bad payload", () => {
    expect(
      parseApiPayload(201, { data: { usdtAmount: 20 } }, isQuotePayload),
    ).toEqual({
      ok: false,
      reason: "unable to reach payment service",
      status: 201,
    });
  });
});

describe("payload guards", () => {
  it("accepts a quote", () => {
    expect(isQuotePayload(quote)).toBe(true);
  });

  it("accepts a payment intent", () => {
    expect(isPaymentIntentPayload(intent)).toBe(true);
  });

  it("rejects an intent missing treasury", () => {
    const copy: Record<string, unknown> = { ...intent };
    delete copy.treasuryAddress;
    expect(isPaymentIntentPayload(copy)).toBe(false);
  });

  it("accepts a payment intent with momo payout status", () => {
    expect(
      isPaymentIntentPayload({
        ...intent,
        payout: {
          status: "pending",
          referenceId: "11111111-1111-4111-8111-111111111111",
          updatedAt: "2026-08-18T11:46:00.000Z",
        },
      }),
    ).toBe(true);
  });
});

describe("isAborted", () => {
  it("detects abort results only", () => {
    expect(isAborted({ ok: false, reason: "aborted", status: 0 })).toBe(true);
    expect(
      isAborted({
        ok: false,
        reason: "unable to reach payment service",
        status: 0,
      }),
    ).toBe(false);
    expect(isAborted({ ok: true, data: quote })).toBe(false);
  });
});
