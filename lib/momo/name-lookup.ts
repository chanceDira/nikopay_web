import type { MomoLookupConfig } from "@/lib/momo/config";

type TokenCache = {
  token: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

export function formatMomoHolderName(body: unknown): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  const row = body as Record<string, unknown>;
  const given = firstString(row.given_name, row.givenName);
  const family = firstString(row.family_name, row.familyName);
  if (given && family) {
    return `${given} ${family}`;
  }
  const combined = firstString(row.name, given, family);
  return combined;
}

export async function lookupMomoHolderName(
  config: MomoLookupConfig,
  msisdn: string,
  fetchImpl: typeof fetch = fetch,
): Promise<
  | { ok: true; name: string }
  | { ok: false; reason: "not_found" | "unavailable" }
> {
  const token = await createAccessToken(config, fetchImpl);
  if (!token.ok) {
    return { ok: false, reason: "unavailable" };
  }

  const response = await momoFetch(
    config,
    `/disbursement/v1_0/accountholder/msisdn/${encodeURIComponent(msisdn)}/basicuserinfo`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${token.token}`,
        "x-target-environment": config.targetEnvironment,
      },
    },
    fetchImpl,
  );

  if (response.status === 404) {
    return { ok: false, reason: "not_found" };
  }
  if (!response.ok) {
    return { ok: false, reason: "unavailable" };
  }

  const name = formatMomoHolderName(response.json);
  if (!name) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true, name };
}

export function clearMomoLookupTokenCache(): void {
  tokenCache = null;
}

async function createAccessToken(
  config: MomoLookupConfig,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return { ok: true, token: tokenCache.token };
  }

  const credentials = Buffer.from(
    `${config.apiUser}:${config.apiKey}`,
    "utf8",
  ).toString("base64");

  const response = await momoFetch(
    config,
    "/disbursement/token/",
    {
      method: "POST",
      headers: {
        authorization: `Basic ${credentials}`,
      },
    },
    fetchImpl,
  );

  if (!response.ok) {
    return { ok: false, reason: "momo token request failed" };
  }

  const body = asRecord(response.json);
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

async function momoFetch(
  config: MomoLookupConfig,
  path: string,
  init: { method: string; headers: Record<string, string> },
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  try {
    const response = await fetchImpl(`${config.baseUrl}${path}`, {
      method: init.method,
      headers: {
        ...init.headers,
        "ocp-apim-subscription-key": config.subscriptionKey,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(12_000),
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      json: text ? safeJson(text) : null,
    };
  } catch {
    return { ok: false, status: 0, json: null };
  }
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
