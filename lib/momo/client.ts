import { randomUUID } from "node:crypto";

import { getMomoSubscriptionKey, type MomoConfig } from "@/lib/momo/config";
import {
  mapMomoProviderStatus,
  type MomoTransferStatus,
} from "@/lib/momo/status";

type TokenCache = {
  token: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

export type MomoTransferLookup = {
  status: MomoTransferStatus;
  financialTransactionId: string | null;
  providerReason: string | null;
};

export async function createAccessToken(
  config: MomoConfig,
): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return { ok: true, token: tokenCache.token };
  }

  const credentials = Buffer.from(
    `${config.apiUser}:${config.apiKey}`,
    "utf8",
  ).toString("base64");

  const response = await momoFetch(config, "/disbursement/token/", {
    method: "POST",
    headers: {
      authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    return { ok: false, reason: "momo token request failed" };
  }

  const body = asJsonRecord(await response.text());
  const token = body?.access_token;
  const expiresRaw = body?.expires_in;
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, reason: "momo token request failed" };
  }

  const expiresIn =
    typeof expiresRaw === "number" ? expiresRaw : Number(expiresRaw);
  const ttlMs =
    Number.isFinite(expiresIn) && expiresIn > 60
      ? (expiresIn - 60) * 1000
      : 50 * 60 * 1000;
  tokenCache = { token, expiresAt: Date.now() + ttlMs };
  return { ok: true, token };
}

export async function requestTransfer(
  config: MomoConfig,
  input: {
    referenceId: string;
    amount: string;
    currency: string;
    msisdn: string;
    externalId: string;
  },
): Promise<{ ok: true } | { ok: false; reason: string; conflict: boolean }> {
  const token = await createAccessToken(config);
  if (!token.ok) {
    return { ok: false, reason: token.reason, conflict: false };
  }

  const headers: Record<string, string> = {
    authorization: `Bearer ${token.token}`,
    "x-reference-id": input.referenceId,
    "x-target-environment": config.targetEnvironment,
    "content-type": "application/json",
  };
  if (config.callbackUrl) {
    headers["x-callback-url"] =
      `${config.callbackUrl.replace(/\/$/, "")}/${input.referenceId}`;
  }

  const response = await momoFetch(config, "/disbursement/v1_0/transfer", {
    method: "POST",
    headers,
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      externalId: input.externalId,
      payee: {
        partyIdType: "MSISDN",
        partyId: input.msisdn,
      },
      payerMessage: "NikoPay",
      payeeNote: "NikoPay",
    }),
  });

  if (response.status === 409) {
    return {
      ok: false,
      reason: "momo transfer already exists",
      conflict: true,
    };
  }

  if (response.status !== 202) {
    return {
      ok: false,
      reason: "momo transfer request failed",
      conflict: false,
    };
  }

  return { ok: true };
}

export async function getTransferStatus(
  config: MomoConfig,
  referenceId: string,
): Promise<
  { ok: true; lookup: MomoTransferLookup } | { ok: false; reason: string }
> {
  const token = await createAccessToken(config);
  if (!token.ok) {
    return token;
  }

  const response = await momoFetch(
    config,
    `/disbursement/v1_0/transfer/${referenceId}`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${token.token}`,
        "x-target-environment": config.targetEnvironment,
      },
    },
  );

  if (!response.ok) {
    return { ok: false, reason: "momo transfer status failed" };
  }

  const body = asJsonRecord(await response.text());
  const status = mapMomoProviderStatus(body?.status);
  if (!status) {
    return { ok: false, reason: "momo transfer status failed" };
  }

  const financialTransactionId =
    typeof body?.financialTransactionId === "string"
      ? body.financialTransactionId
      : null;

  return {
    ok: true,
    lookup: {
      status,
      financialTransactionId,
      providerReason: formatProviderReason(body),
    },
  };
}

/** MTN returns `reason` (code) and sometimes `reasonCode` / message text. */
export function formatProviderReason(
  body: Record<string, unknown> | null | undefined,
): string | null {
  if (!body) {
    return null;
  }

  let code = "";
  if (typeof body.reason === "string" && body.reason.trim()) {
    code = body.reason.trim();
  } else if (typeof body.reasonCode === "string" && body.reasonCode.trim()) {
    code = body.reasonCode.trim();
  }

  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim()
      : "";

  if (!code && !message) {
    return null;
  }
  if (code && message && message !== code) {
    return `${code}: ${message}`;
  }
  return code || message;
}

export async function getAccountBalance(
  config: MomoConfig,
): Promise<
  | { ok: true; availableBalance: number; currency: string }
  | { ok: false; reason: string }
> {
  const token = await createAccessToken(config);
  if (!token.ok) {
    return token;
  }

  const response = await momoFetch(
    config,
    "/disbursement/v1_0/account/balance",
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${token.token}`,
        "x-target-environment": config.targetEnvironment,
      },
    },
  );

  if (!response.ok) {
    return { ok: false, reason: "momo balance is unavailable" };
  }

  const body = asJsonRecord(await response.text());
  const availableBalance = parseBalanceAmount(body?.availableBalance);
  const currency =
    typeof body?.currency === "string" && body.currency.trim()
      ? body.currency.trim()
      : null;

  if (availableBalance === null || !currency) {
    return { ok: false, reason: "momo balance is unavailable" };
  }

  return { ok: true, availableBalance, currency };
}

export async function provisionSandboxApiUser(input: {
  callbackHost: string;
}): Promise<
  { ok: true; apiUser: string; apiKey: string } | { ok: false; reason: string }
> {
  const subscriptionKey = getMomoSubscriptionKey();
  if (!subscriptionKey) {
    return { ok: false, reason: "momo is not configured" };
  }

  const baseUrl = (
    process.env.MOMO_BASE_URL?.trim() || "https://sandbox.momodeveloper.mtn.com"
  ).replace(/\/$/, "");
  const apiUser = randomUUID();

  const created = await fetch(`${baseUrl}/v1_0/apiuser`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "ocp-apim-subscription-key": subscriptionKey,
      "x-reference-id": apiUser,
    },
    body: JSON.stringify({ providerCallbackHost: input.callbackHost }),
    signal: AbortSignal.timeout(12_000),
  });

  if (created.status !== 201) {
    return { ok: false, reason: "momo api user create failed" };
  }

  const keyRes = await fetch(`${baseUrl}/v1_0/apiuser/${apiUser}/apikey`, {
    method: "POST",
    headers: {
      "ocp-apim-subscription-key": subscriptionKey,
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!keyRes.ok) {
    return { ok: false, reason: "momo api key create failed" };
  }

  const body = asJsonRecord(await keyRes.text());
  if (typeof body?.apiKey !== "string" || body.apiKey.length === 0) {
    return { ok: false, reason: "momo api key create failed" };
  }

  return { ok: true, apiUser, apiKey: body.apiKey };
}

async function momoFetch(
  config: MomoConfig,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("ocp-apim-subscription-key", config.subscriptionKey);

  return fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(12_000),
  });
}

function parseBalanceAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function asJsonRecord(text: string): Record<string, unknown> | null {
  if (!text.trim()) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function clearMomoTokenCache(): void {
  tokenCache = null;
}
