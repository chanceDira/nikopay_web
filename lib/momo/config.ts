export type MomoLookupConfig = {
  baseUrl: string;
  targetEnvironment: string;
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
};

export function getMomoLookupConfig():
  { ok: true; config: MomoLookupConfig } | { ok: false; reason: string } {
  const subscriptionKey =
    process.env.MOMO_DISBURSEMENT_SUBSCRIPTION_KEY?.trim();
  const apiUser = process.env.MOMO_API_USER?.trim();
  const apiKey = process.env.MOMO_API_KEY?.trim();

  if (!subscriptionKey || !apiUser || !apiKey) {
    return { ok: false, reason: "momo name lookup is not configured" };
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
      subscriptionKey,
      apiUser,
      apiKey,
    },
  };
}
