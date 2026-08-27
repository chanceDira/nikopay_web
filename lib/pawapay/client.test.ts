import { describe, expect, it, vi } from "vitest";
import {
  getAvailability,
  getPayout,
  getWalletBalances,
  initiatePayout,
  predictProvider,
} from "@/lib/pawapay/client";
import type { PawapayConfig } from "@/lib/pawapay/config";
import type { InitiatePayoutRequest } from "@/lib/pawapay/types";

const config: PawapayConfig = {
  baseUrl: "https://api.sandbox.pawapay.io",
  apiToken: "test-token",
  callbackPath: "/api/pawapay/callback",
  verifyCallbacks: false,
};

const payoutId = "f4401bd2-1568-4140-bf2d-eb77d2b2b639";

const initiateBody: InitiatePayoutRequest = {
  payoutId,
  amount: "100",
  currency: "RWF",
  recipient: {
    type: "MMO",
    accountDetails: {
      phoneNumber: "250783456789",
      provider: "MTN_MOMO_RWA",
    },
  },
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("initiatePayout", () => {
  it("rejects a non-uuid payoutId without calling the network", async () => {
    const fetchImpl = vi.fn();
    const result = await initiatePayout(
      config,
      { ...initiateBody, payoutId: "not-a-uuid" },
      fetchImpl,
    );
    expect(result).toEqual({ ok: false, reason: "payoutId must be a uuid" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns ACCEPTED from a 200 response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        payoutId,
        status: "ACCEPTED",
        created: "2020-10-19T11:17:01Z",
      }),
    );

    const result = await initiatePayout(config, initiateBody, fetchImpl);
    expect(result).toEqual({
      ok: true,
      data: {
        payoutId,
        status: "ACCEPTED",
        created: "2020-10-19T11:17:01Z",
        failureReason: undefined,
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.sandbox.pawapay.io/v2/payouts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer test-token",
        }),
      }),
    );

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({
      payoutId,
      recipient: expect.objectContaining({ type: "MMO" }),
    });
  });

  it("returns REJECTED payload as data when HTTP 200", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        payoutId,
        status: "REJECTED",
        failureReason: {
          failureCode: "PROVIDER_TEMPORARILY_UNAVAILABLE",
          failureMessage: "Provider is unavailable",
        },
      }),
    );

    const result = await initiatePayout(config, initiateBody, fetchImpl);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.status).toBe("REJECTED");
    expect(result.data.failureReason?.failureCode).toBe(
      "PROVIDER_TEMPORARILY_UNAVAILABLE",
    );
  });

  it("maps request timeout", async () => {
    const error = new Error("aborted");
    error.name = "TimeoutError";
    const fetchImpl = vi.fn().mockRejectedValue(error);

    const result = await initiatePayout(config, initiateBody, fetchImpl);
    expect(result).toEqual({
      ok: false,
      reason: "pawapay payout request timed out",
    });
  });
});

describe("getPayout", () => {
  it("parses FOUND COMPLETED", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        status: "FOUND",
        data: {
          payoutId,
          status: "COMPLETED",
          amount: "100",
          currency: "RWF",
          country: "RWA",
          providerTransactionId: "tx-1",
        },
      }),
    );

    const result = await getPayout(config, payoutId, fetchImpl);
    expect(result).toEqual({
      ok: true,
      data: {
        status: "FOUND",
        data: {
          payoutId,
          status: "COMPLETED",
          amount: "100",
          currency: "RWF",
          country: "RWA",
          providerTransactionId: "tx-1",
          failureReason: undefined,
        },
      },
    });
  });
});

describe("toolkit", () => {
  it("predictProvider returns sanitized fields", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        country: "RWA",
        provider: "MTN_MOMO_RWA",
        phoneNumber: "250783456789",
      }),
    );

    const result = await predictProvider(config, "25007 834-56789a", fetchImpl);
    expect(result).toEqual({
      ok: true,
      data: {
        country: "RWA",
        provider: "MTN_MOMO_RWA",
        phoneNumber: "250783456789",
      },
    });
  });

  it("getAvailability parses country rows", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, [
        {
          country: "RWA",
          providers: [
            {
              provider: "MTN_MOMO_RWA",
              operationTypes: [
                { operationType: "PAYOUT", status: "OPERATIONAL" },
              ],
            },
          ],
        },
      ]),
    );

    const result = await getAvailability(
      config,
      { country: "RWA", operationType: "PAYOUT" },
      fetchImpl,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data[0]?.providers[0]?.provider).toBe("MTN_MOMO_RWA");
  });

  it("getWalletBalances parses balances", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        balances: [
          {
            country: "RWA",
            balance: "1000",
            currency: "RWF",
            provider: "",
          },
        ],
      }),
    );

    const result = await getWalletBalances(
      config,
      { country: "RWA" },
      fetchImpl,
    );
    expect(result).toEqual({
      ok: true,
      data: [
        {
          country: "RWA",
          balance: "1000",
          currency: "RWF",
          provider: "",
        },
      ],
    });
  });
});
