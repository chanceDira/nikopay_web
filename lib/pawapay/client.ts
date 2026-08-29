import { isUuid } from "@/lib/identity";
import type { PawapayConfig } from "@/lib/pawapay/config";
import { asPawapayPayoutStatus } from "@/lib/pawapay/status";
import type {
  AvailabilityCountry,
  AvailabilityOperationStatus,
  GetPayoutResponse,
  InitiatePayoutRequest,
  InitiatePayoutResponse,
  PawapayFailureReason,
  PawapayInitiationStatus,
  PawapayPublicKey,
  PredictProviderResponse,
  WalletBalance,
} from "@/lib/pawapay/types";

const REQUEST_TIMEOUT_MS = 12_000;

export type PawapayHttpResult<T> =
  { ok: true; data: T } | { ok: false; reason: string };

type FetchLike = typeof fetch;

export async function initiatePayout(
  config: PawapayConfig,
  body: InitiatePayoutRequest,
  fetchImpl: FetchLike = fetch,
): Promise<PawapayHttpResult<InitiatePayoutResponse>> {
  if (!isUuid(body.payoutId)) {
    return { ok: false, reason: "payoutId must be a uuid" };
  }

  const response = await pawapayFetch(config, "/v2/payouts", {
    method: "POST",
    body: JSON.stringify(body),
    fetchImpl,
  });

  if (!response.ok) {
    if (response.timedOut) {
      return { ok: false, reason: "pawapay payout request timed out" };
    }
    return {
      ok: false,
      reason: `pawapay payout request failed (${response.status})`,
    };
  }

  const parsed = parseInitiatePayoutResponse(response.json);
  if (!parsed) {
    return { ok: false, reason: "pawapay payout response invalid" };
  }

  return { ok: true, data: parsed };
}

export async function getPayout(
  config: PawapayConfig,
  payoutId: string,
  fetchImpl: FetchLike = fetch,
): Promise<PawapayHttpResult<GetPayoutResponse>> {
  if (!isUuid(payoutId)) {
    return { ok: false, reason: "payoutId must be a uuid" };
  }

  const response = await pawapayFetch(config, `/v2/payouts/${payoutId}`, {
    method: "GET",
    fetchImpl,
  });

  if (!response.ok) {
    if (response.timedOut) {
      return { ok: false, reason: "pawapay payout status timed out" };
    }
    return {
      ok: false,
      reason: `pawapay payout status failed (${response.status})`,
    };
  }

  const parsed = parseGetPayoutResponse(response.json);
  if (!parsed) {
    return { ok: false, reason: "pawapay payout status invalid" };
  }

  return { ok: true, data: parsed };
}

export async function getActiveConf(
  config: PawapayConfig,
  query: { country?: string; operationType?: string } = {},
  fetchImpl: FetchLike = fetch,
): Promise<PawapayHttpResult<unknown>> {
  const path = withQuery("/v2/active-conf", {
    country: query.country,
    operationType: query.operationType,
  });

  return getJson(config, path, "pawapay active-conf", fetchImpl);
}

export async function predictProvider(
  config: PawapayConfig,
  phoneNumber: string,
  fetchImpl: FetchLike = fetch,
): Promise<PawapayHttpResult<PredictProviderResponse>> {
  const response = await pawapayFetch(config, "/v2/predict-provider", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
    fetchImpl,
  });

  if (!response.ok) {
    if (response.timedOut) {
      return { ok: false, reason: "pawapay predict-provider timed out" };
    }
    return {
      ok: false,
      reason: `pawapay predict-provider failed (${response.status})`,
    };
  }

  const record = asRecord(response.json);
  const country = asNonEmptyString(record?.country);
  const provider = asNonEmptyString(record?.provider);
  const sanitized = asNonEmptyString(record?.phoneNumber);
  if (!country || !provider || !sanitized) {
    return { ok: false, reason: "pawapay predict-provider response invalid" };
  }

  return {
    ok: true,
    data: { country, provider, phoneNumber: sanitized },
  };
}

export async function getAvailability(
  config: PawapayConfig,
  query: { country?: string; operationType?: string } = {},
  fetchImpl: FetchLike = fetch,
): Promise<PawapayHttpResult<AvailabilityCountry[]>> {
  const path = withQuery("/v2/availability", {
    country: query.country,
    operationType: query.operationType,
  });

  const response = await pawapayFetch(config, path, {
    method: "GET",
    fetchImpl,
  });

  if (!response.ok) {
    if (response.timedOut) {
      return { ok: false, reason: "pawapay availability timed out" };
    }
    return {
      ok: false,
      reason: `pawapay availability failed (${response.status})`,
    };
  }

  const parsed = parseAvailability(response.json);
  if (!parsed) {
    return { ok: false, reason: "pawapay availability response invalid" };
  }

  return { ok: true, data: parsed };
}

export async function getPublicKeys(
  config: PawapayConfig,
  fetchImpl: FetchLike = fetch,
): Promise<PawapayHttpResult<PawapayPublicKey[]>> {
  const response = await pawapayFetch(config, "/v2/public-key/http", {
    method: "GET",
    fetchImpl,
  });

  if (!response.ok) {
    if (response.timedOut) {
      return { ok: false, reason: "pawapay public-key timed out" };
    }
    return {
      ok: false,
      reason: `pawapay public-key failed (${response.status})`,
    };
  }

  if (!Array.isArray(response.json)) {
    return { ok: false, reason: "pawapay public-key response invalid" };
  }

  const keys: PawapayPublicKey[] = [];
  for (const item of response.json) {
    const row = asRecord(item);
    const id = asNonEmptyString(row?.id);
    const key = asNonEmptyString(row?.key);
    if (!id || !key) {
      return { ok: false, reason: "pawapay public-key response invalid" };
    }
    keys.push({ id, key });
  }

  return { ok: true, data: keys };
}

export async function getWalletBalances(
  config: PawapayConfig,
  query: { country?: string } = {},
  fetchImpl: FetchLike = fetch,
): Promise<PawapayHttpResult<WalletBalance[]>> {
  const path = withQuery("/v2/wallet-balances", { country: query.country });

  const response = await pawapayFetch(config, path, {
    method: "GET",
    fetchImpl,
  });

  if (!response.ok) {
    if (response.timedOut) {
      return { ok: false, reason: "pawapay wallet-balances timed out" };
    }
    return {
      ok: false,
      reason: `pawapay wallet-balances failed (${response.status})`,
    };
  }

  const record = asRecord(response.json);
  const balances = record?.balances;
  if (!Array.isArray(balances)) {
    return { ok: false, reason: "pawapay wallet-balances response invalid" };
  }

  const parsed: WalletBalance[] = [];
  for (const item of balances) {
    const row = asRecord(item);
    const country = asNonEmptyString(row?.country);
    const balance = asNonEmptyString(row?.balance);
    const currency = asNonEmptyString(row?.currency);
    if (!country || !balance || !currency) {
      return { ok: false, reason: "pawapay wallet-balances response invalid" };
    }
    parsed.push({
      country,
      balance,
      currency,
      provider: typeof row?.provider === "string" ? row.provider : "",
    });
  }

  return { ok: true, data: parsed };
}

async function getJson(
  config: PawapayConfig,
  path: string,
  label: string,
  fetchImpl: FetchLike,
): Promise<PawapayHttpResult<unknown>> {
  const response = await pawapayFetch(config, path, {
    method: "GET",
    fetchImpl,
  });

  if (!response.ok) {
    if (response.timedOut) {
      return { ok: false, reason: `${label} timed out` };
    }
    return { ok: false, reason: `${label} failed (${response.status})` };
  }

  return { ok: true, data: response.json };
}

type PawapayFetchResult =
  | { ok: true; status: number; json: unknown; timedOut: false }
  | { ok: false; status: number; json: unknown; timedOut: boolean };

async function pawapayFetch(
  config: PawapayConfig,
  path: string,
  init: {
    method: string;
    body?: string;
    fetchImpl: FetchLike;
  },
): Promise<PawapayFetchResult> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${config.apiToken}`,
    accept: "application/json",
  };
  if (init.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  try {
    const response = await init.fetchImpl(`${config.baseUrl}${path}`, {
      method: init.method,
      headers,
      body: init.body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await response.text();
    const json = text ? safeJson(text) : null;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        json,
        timedOut: false,
      };
    }

    return {
      ok: true,
      status: response.status,
      json,
      timedOut: false,
    };
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, status: 0, json: null, timedOut: true };
    }
    return { ok: false, status: 0, json: null, timedOut: false };
  }
}

function parseInitiatePayoutResponse(
  value: unknown,
): InitiatePayoutResponse | null {
  const record = asRecord(value);
  const payoutId = asNonEmptyString(record?.payoutId);
  const status = asInitiationStatus(record?.status);
  if (!payoutId || !status) {
    return null;
  }

  return {
    payoutId,
    status,
    created: asNonEmptyString(record?.created) ?? undefined,
    failureReason: parseFailureReason(record?.failureReason) ?? undefined,
  };
}

function parseGetPayoutResponse(value: unknown): GetPayoutResponse | null {
  const record = asRecord(value);
  const searchStatus = asNonEmptyString(record?.status)?.toUpperCase();
  if (searchStatus === "NOT_FOUND") {
    return { status: "NOT_FOUND" };
  }
  if (searchStatus !== "FOUND") {
    return null;
  }

  const data = asRecord(record?.data);
  const payoutId = asNonEmptyString(data?.payoutId);
  const payoutStatus = asPawapayPayoutStatus(data?.status);
  if (!payoutId || !payoutStatus) {
    return null;
  }

  return {
    status: "FOUND",
    data: {
      payoutId,
      status: payoutStatus,
      amount: asNonEmptyString(data?.amount) ?? undefined,
      currency: asNonEmptyString(data?.currency) ?? undefined,
      country: asNonEmptyString(data?.country) ?? undefined,
      providerTransactionId:
        asNonEmptyString(data?.providerTransactionId) ?? undefined,
      failureReason: parseFailureReason(data?.failureReason) ?? undefined,
    },
  };
}

function parseAvailability(value: unknown): AvailabilityCountry[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const countries: AvailabilityCountry[] = [];
  for (const item of value) {
    const country = parseAvailabilityCountry(item);
    if (!country) {
      return null;
    }
    countries.push(country);
  }

  return countries;
}

function parseAvailabilityCountry(value: unknown): AvailabilityCountry | null {
  const row = asRecord(value);
  const country = asNonEmptyString(row?.country);
  const providersRaw = row?.providers;
  if (!country || !Array.isArray(providersRaw)) {
    return null;
  }

  const providers: AvailabilityCountry["providers"] = [];
  for (const providerItem of providersRaw) {
    const provider = parseAvailabilityProvider(providerItem);
    if (!provider) {
      return null;
    }
    providers.push(provider);
  }

  return { country, providers };
}

function parseAvailabilityProvider(
  value: unknown,
): AvailabilityCountry["providers"][number] | null {
  const providerRow = asRecord(value);
  const provider = asNonEmptyString(providerRow?.provider);
  const opsRaw = providerRow?.operationTypes;
  if (!provider || !Array.isArray(opsRaw)) {
    return null;
  }

  const operationTypes: AvailabilityCountry["providers"][number]["operationTypes"] =
    [];
  for (const op of opsRaw) {
    const operation = parseAvailabilityOperation(op);
    if (!operation) {
      return null;
    }
    operationTypes.push(operation);
  }

  return { provider, operationTypes };
}

function parseAvailabilityOperation(
  value: unknown,
): AvailabilityCountry["providers"][number]["operationTypes"][number] | null {
  const opRow = asRecord(value);
  const operationType = asNonEmptyString(opRow?.operationType);
  const status = asAvailabilityStatus(opRow?.status);
  if (!operationType || !status) {
    return null;
  }
  return { operationType, status };
}

function parseFailureReason(value: unknown): PawapayFailureReason | null {
  const record = asRecord(value);
  const failureCode = asNonEmptyString(record?.failureCode);
  const failureMessage = asNonEmptyString(record?.failureMessage);
  if (!failureCode || !failureMessage) {
    return null;
  }
  return { failureCode, failureMessage };
}

function asInitiationStatus(value: unknown): PawapayInitiationStatus | null {
  if (typeof value !== "string") {
    return null;
  }
  switch (value.toUpperCase()) {
    case "ACCEPTED":
      return "ACCEPTED";
    case "REJECTED":
      return "REJECTED";
    case "DUPLICATE_IGNORED":
      return "DUPLICATE_IGNORED";
    default:
      return null;
  }
}

function asAvailabilityStatus(
  value: unknown,
): AvailabilityOperationStatus | null {
  if (typeof value !== "string") {
    return null;
  }
  switch (value.toUpperCase()) {
    case "OPERATIONAL":
      return "OPERATIONAL";
    case "DELAYED":
      return "DELAYED";
    case "CLOSED":
      return "CLOSED";
    default:
      return null;
  }
}

function withQuery(
  path: string,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value?.trim()) {
      search.set(key, value.trim());
    }
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === "TimeoutError" || error.name === "AbortError";
}
