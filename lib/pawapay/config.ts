export type PayoutProvider = "momo" | "pawapay";

export type PawapayConfig = {
  baseUrl: string;
  apiToken: string;
  callbackPath: string;
  verifyCallbacks: boolean;
};

const SANDBOX_BASE_URL = "https://api.sandbox.pawapay.io";
const DEFAULT_CALLBACK_PATH = "/api/pawapay/callback";

export function getPayoutProvider(): PayoutProvider {
  const value = process.env.PAYOUT_PROVIDER?.trim().toLowerCase();
  if (value === "pawapay") {
    return "pawapay";
  }
  return "momo";
}

export function getPawapayConfig():
  { ok: true; config: PawapayConfig } | { ok: false; reason: string } {
  const apiToken = process.env.PAWAPAY_API_TOKEN?.trim();
  if (!apiToken) {
    return { ok: false, reason: "pawapay is not configured" };
  }

  const baseUrl = (
    process.env.PAWAPAY_BASE_URL?.trim() || SANDBOX_BASE_URL
  ).replace(/\/$/, "");

  const callbackPath =
    process.env.PAWAPAY_CALLBACK_PATH?.trim() || DEFAULT_CALLBACK_PATH;

  return {
    ok: true,
    config: {
      baseUrl,
      apiToken,
      callbackPath,
      verifyCallbacks: process.env.PAWAPAY_VERIFY_CALLBACKS?.trim() === "true",
    },
  };
}
