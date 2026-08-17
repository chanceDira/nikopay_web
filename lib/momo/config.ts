export type MomoConfig = {
  baseUrl: string;
  targetEnvironment: string;
  currency: string;
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
  callbackUrl: string | null;
  sandboxPayeeMsisdn: string | null;
};

export function getMomoConfig():
  { ok: true; config: MomoConfig } | { ok: false; reason: string } {
  const subscriptionKey =
    process.env.MOMO_DISBURSEMENT_SUBSCRIPTION_KEY?.trim();
  const apiUser = process.env.MOMO_API_USER?.trim();
  const apiKey = process.env.MOMO_API_KEY?.trim();

  if (!subscriptionKey || !apiUser || !apiKey) {
    return { ok: false, reason: "momo is not configured" };
  }

  const baseUrl = (
    process.env.MOMO_BASE_URL?.trim() || "https://sandbox.momodeveloper.mtn.com"
  ).replace(/\/$/, "");

  return {
    ok: true,
    config: {
      baseUrl,
      targetEnvironment:
        process.env.MOMO_TARGET_ENVIRONMENT?.trim() || "sandbox",
      currency: process.env.MOMO_CURRENCY?.trim() || "EUR",
      subscriptionKey,
      apiUser,
      apiKey,
      callbackUrl: process.env.MOMO_CALLBACK_URL?.trim() || null,
      sandboxPayeeMsisdn: process.env.MOMO_SANDBOX_PAYEE_MSISDN?.trim() || null,
    },
  };
}

export function getMomoSubscriptionKey(): string | null {
  return process.env.MOMO_DISBURSEMENT_SUBSCRIPTION_KEY?.trim() || null;
}
