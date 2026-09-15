export type PawapayConfig = {
  baseUrl: string;
  apiToken: string;
  callbackPath: string;
  verifyCallbacks: boolean;
};

const SANDBOX_BASE_URL = "https://api.sandbox.pawapay.io";
const DEFAULT_CALLBACK_PATH = "/api/pawapay/callback";

export function isPawapayConfigured(): boolean {
  return getPawapayConfig().ok;
}

export function getPawapayConfig():
  | { ok: true; config: PawapayConfig }
  | { ok: false; reason: string } {
  const apiToken = process.env.PAWAPAY_API_TOKEN?.trim();
  if (!apiToken) {
    return { ok: false, reason: "pawapay is not configured" };
  }

  const rawBaseUrl = process.env.PAWAPAY_BASE_URL?.trim();
  if (!rawBaseUrl && process.env.NODE_ENV === "production") {
    return {
      ok: false,
      reason: "PAWAPAY_BASE_URL is required in production",
    };
  }

  const baseUrl = (rawBaseUrl || SANDBOX_BASE_URL).replace(/\/$/, "");

  const callbackPath =
    process.env.PAWAPAY_CALLBACK_PATH?.trim() || DEFAULT_CALLBACK_PATH;

  return {
    ok: true,
    config: {
      baseUrl,
      apiToken,
      callbackPath,
      verifyCallbacks: resolveVerifyCallbacks(baseUrl, process.env),
    },
  };
}

export function resolveVerifyCallbacks(
  baseUrl: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const isSandbox = pawapayEnvironment(baseUrl) === "sandbox";
  const raw = env.PAWAPAY_VERIFY_CALLBACKS?.trim().toLowerCase();

  if (raw === "true" || raw === "1" || raw === "yes") {
    return true;
  }
  if (raw === "false" || raw === "0" || raw === "no") {
    return isSandbox ? false : true;
  }

  return !isSandbox;
}

export function pawapayDashboardUrl(baseUrl: string): string {
  return baseUrl.includes("sandbox.pawapay.io")
    ? "https://dashboard.sandbox.pawapay.io"
    : "https://dashboard.pawapay.io";
}

export function pawapayEnvironment(baseUrl: string): "sandbox" | "production" {
  return baseUrl.includes("sandbox.pawapay.io") ? "sandbox" : "production";
}
