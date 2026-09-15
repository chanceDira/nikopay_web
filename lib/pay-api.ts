import { isPaymentStatus } from "@/lib/settlement/intent-status";
import { optionalIso } from "@/lib/settlement/timing";
import {
  isChainId,
  type PaymentIntent,
  type PaymentIntentSummary,
  type Quote,
} from "@/lib/settlement/types";

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; reason: string; status: number };

const GENERIC_ERROR = "unable to reach payment service";

export function parseApiPayload<T>(
  status: number,
  body: unknown,
  guard: (value: unknown) => value is T,
): ApiResult<T> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, reason: GENERIC_ERROR, status };
  }

  const record = body as Record<string, unknown>;
  if (status >= 200 && status < 300 && guard(record.data)) {
    return { ok: true, data: record.data };
  }

  const reason =
    typeof record.error === "string" && record.error.length > 0
      ? record.error
      : GENERIC_ERROR;

  return { ok: false, reason, status };
}

function optionalFinite(value: unknown): boolean {
  return (
    value === undefined || (typeof value === "number" && Number.isFinite(value))
  );
}

export function isQuotePayload(value: unknown): value is Quote {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const quote = value as Record<string, unknown>;
  return (
    typeof quote.usdtAmount === "number" &&
    Number.isFinite(quote.usdtAmount) &&
    typeof quote.rate === "number" &&
    Number.isFinite(quote.rate) &&
    typeof quote.feePercent === "number" &&
    Number.isFinite(quote.feePercent) &&
    typeof quote.currency === "string" &&
    typeof quote.feeLocal === "number" &&
    Number.isFinite(quote.feeLocal) &&
    typeof quote.netLocal === "number" &&
    Number.isFinite(quote.netLocal) &&
    typeof quote.feeRwf === "number" &&
    Number.isFinite(quote.feeRwf) &&
    typeof quote.netRwf === "number" &&
    Number.isFinite(quote.netRwf) &&
    isChainId(quote.chain) &&
    typeof quote.expiresAt === "string" &&
    typeof quote.pawapayPercent === "number" &&
    Number.isFinite(quote.pawapayPercent) &&
    typeof quote.mnoFixed === "number" &&
    Number.isFinite(quote.mnoFixed) &&
    typeof quote.pawapayFeeLocal === "number" &&
    Number.isFinite(quote.pawapayFeeLocal) &&
    typeof quote.mnoFeeLocal === "number" &&
    Number.isFinite(quote.mnoFeeLocal) &&
    typeof quote.nikopayFeeLocal === "number" &&
    Number.isFinite(quote.nikopayFeeLocal) &&
    typeof quote.grossLocal === "number" &&
    Number.isFinite(quote.grossLocal)
  );
}

export function isPaymentIntentPayload(value: unknown): value is PaymentIntent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const intent = value as Record<string, unknown>;
  const baseOk =
    typeof intent.id === "string" &&
    isPaymentStatus(intent.status) &&
    isChainId(intent.chain) &&
    typeof intent.walletAddress === "string" &&
    typeof intent.msisdn === "string" &&
    typeof intent.country === "string" &&
    typeof intent.currency === "string" &&
    typeof intent.provider === "string" &&
    typeof intent.usdtAmount === "number" &&
    Number.isFinite(intent.usdtAmount) &&
    typeof intent.payUsdt === "number" &&
    Number.isFinite(intent.payUsdt) &&
    typeof intent.rate === "number" &&
    Number.isFinite(intent.rate) &&
    typeof intent.feePercent === "number" &&
    Number.isFinite(intent.feePercent) &&
    typeof intent.feeRwf === "number" &&
    Number.isFinite(intent.feeRwf) &&
    typeof intent.netRwf === "number" &&
    Number.isFinite(intent.netRwf) &&
    typeof intent.treasuryAddress === "string" &&
    typeof intent.expiresAt === "string" &&
    typeof intent.createdAt === "string" &&
    typeof intent.updatedAt === "string" &&
    optionalFinite(intent.pawapayPercent) &&
    optionalFinite(intent.mnoFixed) &&
    optionalFinite(intent.pawapayFeeLocal) &&
    optionalFinite(intent.mnoFeeLocal) &&
    optionalFinite(intent.nikopayFeeLocal) &&
    optionalFinite(intent.grossLocal);

  if (!baseOk) {
    return false;
  }

  if (
    intent.notifyEmail !== undefined &&
    typeof intent.notifyEmail !== "string"
  ) {
    return false;
  }

  if (intent.payoutRef !== undefined && typeof intent.payoutRef !== "string") {
    return false;
  }

  if (intent.momoRef !== undefined && typeof intent.momoRef !== "string") {
    return false;
  }

  if (
    !optionalIso(intent.detectedAt) ||
    !optionalIso(intent.creditedAt) ||
    !optionalIso(intent.payoutStartedAt) ||
    !optionalIso(intent.paidAt)
  ) {
    return false;
  }

  if (intent.payout === undefined) {
    return true;
  }

  return isIntentPayoutPayload(intent.payout);
}

function isIntentPayoutPayload(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const payout = value as Record<string, unknown>;
  const statusOk =
    payout.status === "pending" ||
    payout.status === "enqueued" ||
    payout.status === "successful" ||
    payout.status === "failed" ||
    payout.status === "timeout";
  return (
    statusOk &&
    typeof payout.referenceId === "string" &&
    typeof payout.updatedAt === "string" &&
    (payout.providerRef === undefined || typeof payout.providerRef === "string")
  );
}

function isPaymentIntentSummaryPayload(
  value: unknown,
): value is PaymentIntentSummary {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const intent = value as Record<string, unknown>;
  return (
    typeof intent.id === "string" &&
    isPaymentStatus(intent.status) &&
    isChainId(intent.chain) &&
    typeof intent.walletAddress === "string" &&
    typeof intent.usdtAmount === "number" &&
    Number.isFinite(intent.usdtAmount) &&
    typeof intent.payUsdt === "number" &&
    Number.isFinite(intent.payUsdt) &&
    typeof intent.rate === "number" &&
    Number.isFinite(intent.rate) &&
    typeof intent.feePercent === "number" &&
    Number.isFinite(intent.feePercent) &&
    typeof intent.feeRwf === "number" &&
    Number.isFinite(intent.feeRwf) &&
    typeof intent.netRwf === "number" &&
    Number.isFinite(intent.netRwf) &&
    typeof intent.treasuryAddress === "string" &&
    typeof intent.expiresAt === "string" &&
    typeof intent.createdAt === "string" &&
    typeof intent.updatedAt === "string" &&
    optionalIso(intent.detectedAt) &&
    optionalIso(intent.creditedAt) &&
    optionalIso(intent.payoutStartedAt) &&
    optionalIso(intent.paidAt)
  );
}

function isPaymentIntentSummaryList(
  value: unknown,
): value is PaymentIntentSummary[] {
  return Array.isArray(value) && value.every(isPaymentIntentSummaryPayload);
}

async function requestJson<T>(
  url: string,
  guard: (value: unknown) => value is T,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      return { ok: false, reason: GENERIC_ERROR, status: res.status };
    }
    return parseApiPayload(res.status, body, guard);
  } catch (err) {
    if (isAbortError(err)) {
      return { ok: false, reason: "aborted", status: 0 };
    }
    return { ok: false, reason: GENERIC_ERROR, status: 0 };
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

export function isAborted(result: ApiResult<unknown>): boolean {
  return !result.ok && result.reason === "aborted";
}

export async function requestQuote(input: {
  chain: Quote["chain"];
  currency?: string;
  country?: string;
  provider?: string;
  usdtAmount?: number;
  netLocal?: number;
  signal?: AbortSignal;
}): Promise<ApiResult<Quote>> {
  const body: Record<string, unknown> = {
    chain: input.chain,
    currency: input.currency ?? "RWF",
  };
  if (input.usdtAmount != null) {
    body.usdtAmount = input.usdtAmount;
  }
  if (input.netLocal != null) {
    body.netLocal = input.netLocal;
  }
  if (input.country) {
    body.country = input.country;
  }
  if (input.provider) {
    body.provider = input.provider;
  }

  return requestJson("/api/quotes", isQuotePayload, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: input.signal,
  });
}

function isQuoteCurrenciesPayload(
  value: unknown,
): value is { currencies: string[] } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    Array.isArray(row.currencies) &&
    row.currencies.every((code) => typeof code === "string")
  );
}

export async function listQuoteCurrencies(
  signal?: AbortSignal,
): Promise<ApiResult<{ currencies: string[] }>> {
  return requestJson("/api/quotes/currencies", isQuoteCurrenciesPayload, {
    signal,
  });
}

export async function createLiveIntent(input: {
  usdtAmount: number;
  netLocal?: number;
  chain: Quote["chain"];
  msisdn: string;
  walletAddress: string;
  country: string;
  currency: string;
  provider: string;
  notifyEmail?: string;
  checkoutToken?: string;
}): Promise<ApiResult<PaymentIntent>> {
  return requestJson("/api/intents", isPaymentIntentPayload, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export type UserCheckoutLink = {
  id: string;
  token: string;
  label: string | null;
  usdtAmount: number;
  country: string;
  currency: string;
  provider: string;
  msisdn: string;
  path: string;
  url: string;
  status: "active" | "used" | "revoked" | "expired";
  expiresAt: string | null;
  intentId: string | null;
  createdAt: string;
};

function isUserCheckoutLink(value: unknown): value is UserCheckoutLink {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.token === "string" &&
    (row.label === null || typeof row.label === "string") &&
    typeof row.usdtAmount === "number" &&
    Number.isFinite(row.usdtAmount) &&
    typeof row.country === "string" &&
    typeof row.currency === "string" &&
    typeof row.provider === "string" &&
    typeof row.msisdn === "string" &&
    typeof row.path === "string" &&
    typeof row.url === "string" &&
    (row.status === "active" ||
      row.status === "used" ||
      row.status === "revoked" ||
      row.status === "expired") &&
    (row.expiresAt === null || typeof row.expiresAt === "string") &&
    (row.intentId === null || typeof row.intentId === "string") &&
    typeof row.createdAt === "string"
  );
}

function isCheckoutCreatedPayload(
  value: unknown,
): value is { checkout: UserCheckoutLink } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return isUserCheckoutLink(row.checkout);
}

export async function createUserCheckout(input: {
  label?: string | null;
  usdtAmount: number;
  country: string;
  currency: string;
  provider: string;
  msisdn: string;
  expiresHours?: number;
}): Promise<ApiResult<{ checkout: UserCheckoutLink }>> {
  return requestJson("/api/checkouts", isCheckoutCreatedPayload, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export type CorridorProviderOption = {
  country: string;
  provider: string;
  displayName: string;
  currency: string;
  decimalsInAmount: "NONE" | "TWO_PLACES";
  minAmount: string;
  maxAmount: string;
  payoutStatus?: "OPERATIONAL" | "DELAYED" | "CLOSED";
  rateConfigured?: boolean;
};

export type CorridorCountryOption = {
  country: string;
  prefix: string;
  displayName: string;
};

export type CorridorPredictResult = {
  country: string;
  provider: string;
  currency: string;
  phoneNumber: string;
  decimalsInAmount: "NONE" | "TWO_PLACES";
  minAmount: string;
  maxAmount: string;
  rateConfigured?: boolean;
};

function isCorridorCountriesPayload(
  value: unknown,
): value is { countries: CorridorCountryOption[] } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    Array.isArray(row.countries) && row.countries.every(isCorridorCountryOption)
  );
}

function isCorridorCountryOption(
  value: unknown,
): value is CorridorCountryOption {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.country === "string" &&
    typeof row.prefix === "string" &&
    typeof row.displayName === "string"
  );
}

function isCorridorProvidersPayload(
  value: unknown,
): value is { country: string; providers: CorridorProviderOption[] } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.country === "string" &&
    Array.isArray(row.providers) &&
    row.providers.every(isCorridorProviderOption)
  );
}

function isCorridorProviderOption(
  value: unknown,
): value is CorridorProviderOption {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  const statusOk =
    row.payoutStatus === undefined ||
    row.payoutStatus === "OPERATIONAL" ||
    row.payoutStatus === "DELAYED" ||
    row.payoutStatus === "CLOSED";
  const rateOk =
    row.rateConfigured === undefined || typeof row.rateConfigured === "boolean";
  return (
    typeof row.country === "string" &&
    typeof row.provider === "string" &&
    typeof row.displayName === "string" &&
    typeof row.currency === "string" &&
    (row.decimalsInAmount === "NONE" ||
      row.decimalsInAmount === "TWO_PLACES") &&
    typeof row.minAmount === "string" &&
    typeof row.maxAmount === "string" &&
    statusOk &&
    rateOk
  );
}

function isCorridorPredictPayload(
  value: unknown,
): value is CorridorPredictResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.country === "string" &&
    typeof row.provider === "string" &&
    typeof row.currency === "string" &&
    typeof row.phoneNumber === "string" &&
    (row.decimalsInAmount === "NONE" ||
      row.decimalsInAmount === "TWO_PLACES") &&
    typeof row.minAmount === "string" &&
    typeof row.maxAmount === "string" &&
    (row.rateConfigured === undefined ||
      typeof row.rateConfigured === "boolean")
  );
}

export async function fetchCorridorCountries(
  signal?: AbortSignal,
): Promise<ApiResult<{ countries: CorridorCountryOption[] }>> {
  return requestJson("/api/corridors", isCorridorCountriesPayload, { signal });
}

export async function fetchDepositCorridorCountries(
  signal?: AbortSignal,
): Promise<ApiResult<{ countries: CorridorCountryOption[] }>> {
  return requestJson(
    "/api/corridors?operation=DEPOSIT",
    isCorridorCountriesPayload,
    { signal },
  );
}

export async function fetchCorridorProviders(
  country: string,
  signal?: AbortSignal,
): Promise<
  ApiResult<{ country: string; providers: CorridorProviderOption[] }>
> {
  return requestJson(
    `/api/corridors?country=${encodeURIComponent(country)}`,
    isCorridorProvidersPayload,
    { signal },
  );
}

export async function fetchDepositCorridorProviders(
  country: string,
  signal?: AbortSignal,
): Promise<
  ApiResult<{ country: string; providers: CorridorProviderOption[] }>
> {
  return requestJson(
    `/api/corridors?operation=DEPOSIT&country=${encodeURIComponent(country)}`,
    isCorridorProvidersPayload,
    { signal },
  );
}

export async function fetchRemittanceCorridorCountries(
  signal?: AbortSignal,
): Promise<ApiResult<{ countries: CorridorCountryOption[] }>> {
  return requestJson(
    "/api/corridors?operation=REMITTANCE",
    isCorridorCountriesPayload,
    { signal },
  );
}

export async function fetchRemittanceCorridorProviders(
  country: string,
  signal?: AbortSignal,
): Promise<
  ApiResult<{ country: string; providers: CorridorProviderOption[] }>
> {
  return requestJson(
    `/api/corridors?operation=REMITTANCE&country=${encodeURIComponent(country)}`,
    isCorridorProvidersPayload,
    { signal },
  );
}

export type RecipientNamePreview = {
  status: "found" | "not_found" | "unavailable";
  displayName: string | null;
  source: "mtn" | null;
};

function isRecipientNamePreview(value: unknown): value is RecipientNamePreview {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  const statusOk =
    row.status === "found" ||
    row.status === "not_found" ||
    row.status === "unavailable";
  const nameOk =
    row.displayName === null || typeof row.displayName === "string";
  const sourceOk = row.source === null || row.source === "mtn";
  return statusOk && nameOk && sourceOk;
}

export async function predictCorridorProvider(
  msisdn: string,
  signal?: AbortSignal,
): Promise<ApiResult<CorridorPredictResult>> {
  return requestJson("/api/corridors/predict", isCorridorPredictPayload, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msisdn }),
    signal,
  });
}

export async function fetchRecipientNamePreview(
  input: { msisdn: string; country: string; provider: string },
  signal?: AbortSignal,
): Promise<ApiResult<RecipientNamePreview>> {
  return requestJson("/api/corridors/recipient-name", isRecipientNamePreview, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
}

export async function fetchLiveIntent(
  id: string,
  signal?: AbortSignal,
): Promise<ApiResult<PaymentIntent>> {
  return requestJson(
    `/api/intents/${id}`,
    isPaymentIntentPayload,
    signal ? { signal } : undefined,
  );
}

export async function reportIntentDeposit(
  id: string,
  txHash: string,
): Promise<ApiResult<PaymentIntent>> {
  return requestJson(`/api/intents/${id}/deposit`, isPaymentIntentPayload, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash }),
  });
}

export async function reportIntentDepositWhenReady(
  id: string,
  txHash: string,
): Promise<ApiResult<PaymentIntent>> {
  let last: ApiResult<PaymentIntent> | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    last = await reportIntentDeposit(id, txHash);
    if (last.ok || (last.status !== 409 && last.status !== 503)) {
      return last;
    }
    await wait(1500);
  }

  return last ?? { ok: false, reason: GENERIC_ERROR, status: 0 };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function syncLiveIntent(
  id: string,
  signal?: AbortSignal,
): Promise<ApiResult<PaymentIntent>> {
  return requestJson(`/api/intents/${id}/sync`, isPaymentIntentPayload, {
    method: "POST",
    signal,
  });
}

export async function fetchLiveIntentsByWallet(
  walletAddress: string,
  signal?: AbortSignal,
): Promise<ApiResult<PaymentIntentSummary[]>> {
  const params = new URLSearchParams({ wallet: walletAddress });
  return requestJson(
    `/api/intents?${params.toString()}`,
    isPaymentIntentSummaryList,
    signal ? { signal } : undefined,
  );
}
