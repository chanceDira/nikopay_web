import { describe, expect, it, vi } from "vitest";
import type { PawapayConfig } from "@/lib/pawapay/config";
import { runSandboxPayoutSpike } from "@/lib/pawapay/spike";
import type { SpikeStore } from "@/lib/pawapay/spike";
import type { PayoutTransferInsert } from "@/lib/pawapay/transfers";

const config: PawapayConfig = {
  baseUrl: "https://api.sandbox.pawapay.io",
  apiToken: "test-token",
  callbackPath: "/api/pawapay/callback",
  verifyCallbacks: false,
};

const intentId = "11111111-1111-4111-8111-111111111111";

const confBody = {
  countries: [
    {
      country: "RWA",
      providers: [
        {
          provider: "MTN_MOMO_RWA",
          currencies: [
            {
              currency: "RWF",
              operationTypes: {
                PAYOUT: {
                  minAmount: "1",
                  maxAmount: "100000",
                  decimalsInAmount: "NONE",
                },
              },
            },
          ],
        },
      ],
    },
  ],
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function memoryStore(
  intentStatus: string,
): SpikeStore & { inserts: PayoutTransferInsert[]; patches: unknown[] } {
  const inserts: PayoutTransferInsert[] = [];
  const patches: unknown[] = [];
  return {
    inserts,
    patches,
    getIntentStatus: async () => {
      if (intentStatus === "missing") {
        return { ok: false, reason: "payment intent not found" };
      }
      return { ok: true, status: intentStatus };
    },
    insertTransfer: async (row) => {
      inserts.push(row);
      return { ok: true };
    },
    updateTransfer: async (payoutId, patch) => {
      patches.push({ payoutId, ...patch });
      return { ok: true };
    },
  };
}

describe("runSandboxPayoutSpike", () => {
  it("refuses live intents without calling PawaPay", async () => {
    const fetchImpl = vi.fn();
    const store = memoryStore("credited");
    const result = await runSandboxPayoutSpike({
      intentId,
      msisdn: "250783456789",
      config,
      fetchImpl,
      store,
    });
    expect(result).toEqual({
      ok: false,
      reason: "spike refuses live payment intents",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(store.inserts).toHaveLength(0);
  });

  it("persists payoutId before initiate and does not settle the intent", async () => {
    const calls: string[] = [];
    const store = memoryStore("expired");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/v2/predict-provider")) {
        return jsonResponse(200, {
          country: "RWA",
          provider: "MTN_MOMO_RWA",
          phoneNumber: "250783456789",
        });
      }
      if (url.includes("/v2/active-conf")) {
        return jsonResponse(200, confBody);
      }
      if (url.endsWith("/v2/payouts") && store.inserts.length === 0) {
        throw new Error("initiate called before persist");
      }
      if (url.endsWith("/v2/payouts")) {
        return jsonResponse(200, {
          payoutId: store.inserts[0]?.payoutId,
          status: "ACCEPTED",
        });
      }
      if (url.includes("/v2/payouts/")) {
        return jsonResponse(200, {
          status: "FOUND",
          data: {
            payoutId: store.inserts[0]?.payoutId,
            status: "COMPLETED",
            providerTransactionId: "tx-1",
          },
        });
      }
      throw new Error(`unexpected ${url}`);
    });

    const result = await runSandboxPayoutSpike({
      intentId,
      msisdn: "250783456789",
      config,
      fetchImpl,
      store,
      waitMs: 0,
      pollAttempts: 2,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(store.inserts).toHaveLength(1);
    expect(store.inserts[0]?.intentId).toBe(intentId);
    expect(store.inserts[0]?.amount).toBe(1);
    expect(store.inserts[0]?.currency).toBe("RWF");
    expect(result.result.payoutId).toBe(store.inserts[0]?.payoutId);
    expect(result.result.status).toBe("successful");
    expect(store.patches.at(-1)).toMatchObject({
      status: "successful",
      providerRef: "tx-1",
    });
    expect(calls.some((url) => url.endsWith("/v2/payouts"))).toBe(true);
    expect(calls.findIndex((url) => url.includes("/v2/predict-provider"))).toBe(
      0,
    );
  });

  it("marks the transfer failed on REJECTED and still skips intent settle", async () => {
    const store = memoryStore("manual_review");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/v2/predict-provider")) {
        return jsonResponse(200, {
          country: "RWA",
          provider: "MTN_MOMO_RWA",
          phoneNumber: "250783456789",
        });
      }
      if (url.includes("/v2/active-conf")) {
        return jsonResponse(200, confBody);
      }
      return jsonResponse(200, {
        payoutId: store.inserts[0]?.payoutId,
        status: "REJECTED",
        failureReason: {
          failureCode: "INVALID_AMOUNT",
          failureMessage: "bad amount",
        },
      });
    });

    const result = await runSandboxPayoutSpike({
      intentId,
      msisdn: "250783456789",
      config,
      fetchImpl,
      store,
      waitMs: 0,
    });

    expect(result).toEqual({
      ok: true,
      result: {
        payoutId: store.inserts[0]?.payoutId,
        status: "failed",
      },
    });
    expect(store.patches).toEqual([
      {
        payoutId: store.inserts[0]?.payoutId,
        status: "failed",
        providerReason: "INVALID_AMOUNT",
      },
    ]);
  });
});
