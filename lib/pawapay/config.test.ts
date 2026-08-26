import { afterEach, describe, expect, it } from "vitest";
import { getPawapayConfig, getPayoutProvider } from "@/lib/pawapay/config";

const keys = [
  "PAWAPAY_API_TOKEN",
  "PAWAPAY_BASE_URL",
  "PAWAPAY_CALLBACK_PATH",
  "PAWAPAY_VERIFY_CALLBACKS",
  "PAYOUT_PROVIDER",
] as const;

const snapshot = Object.fromEntries(
  keys.map((key) => [key, process.env[key]]),
) as Record<(typeof keys)[number], string | undefined>;

afterEach(() => {
  for (const key of keys) {
    const previous = snapshot[key];
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
});

describe("getPawapayConfig", () => {
  it("fails closed without a token", () => {
    delete process.env.PAWAPAY_API_TOKEN;
    expect(getPawapayConfig()).toEqual({
      ok: false,
      reason: "pawapay is not configured",
    });
  });

  it("returns sandbox defaults when only the token is set", () => {
    process.env.PAWAPAY_API_TOKEN = "test-token";
    delete process.env.PAWAPAY_BASE_URL;
    delete process.env.PAWAPAY_CALLBACK_PATH;
    delete process.env.PAWAPAY_VERIFY_CALLBACKS;

    expect(getPawapayConfig()).toEqual({
      ok: true,
      config: {
        baseUrl: "https://api.sandbox.pawapay.io",
        apiToken: "test-token",
        callbackPath: "/api/pawapay/callback",
        verifyCallbacks: false,
      },
    });
  });

  it("strips a trailing slash on the base url", () => {
    process.env.PAWAPAY_API_TOKEN = "test-token";
    process.env.PAWAPAY_BASE_URL = "https://api.pawapay.io/";
    process.env.PAWAPAY_VERIFY_CALLBACKS = "true";

    const result = getPawapayConfig();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.config.baseUrl).toBe("https://api.pawapay.io");
    expect(result.config.verifyCallbacks).toBe(true);
  });
});

describe("getPayoutProvider", () => {
  it("defaults to momo until cutover", () => {
    delete process.env.PAYOUT_PROVIDER;
    expect(getPayoutProvider()).toBe("momo");
  });

  it("selects pawapay when flagged", () => {
    process.env.PAYOUT_PROVIDER = "pawapay";
    expect(getPayoutProvider()).toBe("pawapay");
  });
});
