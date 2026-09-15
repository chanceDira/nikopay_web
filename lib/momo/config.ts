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

  const baseUrl = process.env.MOMO_BASE_URL?.trim();
  const targetEnvironment = process.env.MOMO_TARGET_ENVIRONMENT?.trim();

  if (
    !subscriptionKey ||
    !apiUser ||
    !apiKey ||
    !baseUrl ||
    !targetEnvironment
  ) {
    return { ok: false, reason: "momo name lookup is not configured" };
  }

  return {
    ok: true,
    config: {
      baseUrl: baseUrl.replace(/\/$/, ""),
      targetEnvironment,
      subscriptionKey,
      apiUser,
      apiKey,
    },
  };
}
