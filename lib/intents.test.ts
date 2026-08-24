import { describe, expect, it } from "vitest";
import { toPaymentIntent } from "@/lib/intents";
import type { PaymentIntentRow } from "@/lib/supabase/types";

const row: PaymentIntentRow = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: null,
  wallet_address: "0xabcdef0000000000000000000000000000000001",
  status: "awaiting_payment",
  chain_id: "base",
  msisdn: "250788123456",
  usdt_amount: 20,
  rate: 1450,
  fee_percent: 1.5,
  fee_rwf: 435,
  net_rwf: 28565,
  treasury_address: "0x0000000000000000000000000000000000000012",
  expires_at: "2026-08-14T12:00:00.000Z",
  deposit_tx: null,
  momo_ref: null,
  notify_email: null,
  paid_notified_at: null,
  failed_notified_at: null,
  created_at: "2026-08-14T11:45:00.000Z",
  updated_at: "2026-08-14T11:45:00.000Z",
};

describe("toPaymentIntent", () => {
  it("maps a row to the domain intent", () => {
    expect(toPaymentIntent(row)).toEqual({
      id: row.id,
      status: "awaiting_payment",
      chain: "base",
      walletAddress: row.wallet_address,
      msisdn: row.msisdn,
      usdtAmount: 20,
      rate: 1450,
      feePercent: 1.5,
      feeRwf: 435,
      netRwf: 28565,
      treasuryAddress: row.treasury_address,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });

  it("coerces numeric strings from postgres", () => {
    const intent = toPaymentIntent({
      ...row,
      usdt_amount: "20.5" as unknown as number,
    });

    expect(intent?.usdtAmount).toBe(20.5);
  });
});
