import { randomBytes } from "node:crypto";
import {
  normalizeCorridorCountry,
  normalizeCorridorCurrency,
  normalizeCorridorProvider,
} from "@/lib/corridor";
import { normalizeMsisdnForCountry } from "@/lib/identity";
import { parseUsdtAmount } from "@/lib/http";
import { getActiveConf } from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";
import {
  listPayoutCountries,
  listPayoutProviders,
} from "@/lib/pawapay/corridor";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CheckoutLinkRow } from "@/lib/supabase/types";
import { toNumber } from "@/lib/numbers";
import { resolvePublicSiteUrl } from "@/lib/site-url";

export const CHECKOUT_UNAVAILABLE = "This checkout is no longer available.";
const TOKEN_REGEX = /^[A-Za-z0-9_-]{24,48}$/;
const USDT_EPS = 1e-8;
const DEFAULT_TTL_HOURS = 72;
const MAX_TTL_HOURS = 720;

export type CheckoutPublic = {
  token: string;
  label: string | null;
  usdtAmount: number;
  country: string;
  currency: string;
  provider: string;
  msisdn: string;
};

export type CheckoutAdmin = CheckoutPublic & {
  id: string;
  path: string;
  url: string;
  status: "active" | "used" | "revoked" | "expired";
  expiresAt: string | null;
  revokedAt: string | null;
  intentId: string | null;
  createdBy: string;
  createdAt: string;
};

export function generateCheckoutToken(): string {
  return randomBytes(18).toString("base64url");
}

export function normalizeCheckoutToken(
  value: unknown,
): { ok: true; token: string } | { ok: false; reason: string } {
  if (typeof value !== "string") {
    return { ok: false, reason: "checkout is invalid" };
  }
  const token = value.trim();
  if (!TOKEN_REGEX.test(token)) {
    return { ok: false, reason: "checkout is invalid" };
  }
  return { ok: true, token };
}

export function checkoutAvailability(
  row: Pick<CheckoutLinkRow, "revoked_at" | "expires_at">,
  used: boolean,
  nowMs = Date.now(),
): { ok: true } | { ok: false; reason: string; status: number } {
  if (row.revoked_at) {
    return { ok: false, reason: CHECKOUT_UNAVAILABLE, status: 410 };
  }
  if (row.expires_at && Date.parse(row.expires_at) <= nowMs) {
    return { ok: false, reason: CHECKOUT_UNAVAILABLE, status: 410 };
  }
  if (used) {
    return { ok: false, reason: CHECKOUT_UNAVAILABLE, status: 410 };
  }
  return { ok: true };
}

export function checkoutLocksMatch(
  row: CheckoutLinkRow,
  input: {
    usdtAmount: number;
    country: string;
    currency: string;
    provider: string;
    msisdn: string;
  },
): { ok: true } | { ok: false; reason: string } {
  if (Math.abs(toNumber(row.usdt_amount) - input.usdtAmount) > USDT_EPS) {
    return { ok: false, reason: "amount does not match this checkout" };
  }
  if (row.country !== input.country) {
    return { ok: false, reason: "corridor does not match this checkout" };
  }
  if (row.currency !== input.currency) {
    return { ok: false, reason: "corridor does not match this checkout" };
  }
  if (row.provider !== input.provider) {
    return { ok: false, reason: "corridor does not match this checkout" };
  }
  if (row.msisdn !== input.msisdn) {
    return { ok: false, reason: "recipient does not match this checkout" };
  }
  return { ok: true };
}

export function parseCheckoutLabel(
  value: unknown,
): { ok: true; label: string | null } | { ok: false; reason: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, label: null };
  }
  if (typeof value !== "string") {
    return { ok: false, reason: "label is invalid" };
  }
  const label = value.trim();
  if (!label) {
    return { ok: true, label: null };
  }
  if (label.length > 80) {
    return { ok: false, reason: "label must be 80 characters or fewer" };
  }
  return { ok: true, label };
}

export function parseCheckoutTtlHours(
  value: unknown,
): { ok: true; hours: number } | { ok: false; reason: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, hours: DEFAULT_TTL_HOURS };
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { ok: false, reason: "expiry hours must be a whole number" };
  }
  if (value < 0 || value > MAX_TTL_HOURS) {
    return { ok: false, reason: "expiry hours must be between 0 and 720" };
  }
  return { ok: true, hours: value };
}

function toPublic(row: CheckoutLinkRow): CheckoutPublic {
  return {
    token: row.token,
    label: row.label,
    usdtAmount: toNumber(row.usdt_amount),
    country: row.country,
    currency: row.currency,
    provider: row.provider,
    msisdn: row.msisdn,
  };
}

function toAdmin(
  row: CheckoutLinkRow,
  intentId: string | null,
  nowMs = Date.now(),
): CheckoutAdmin {
  const used = Boolean(intentId);
  let status: CheckoutAdmin["status"] = "active";
  if (row.revoked_at) {
    status = "revoked";
  } else if (row.expires_at && Date.parse(row.expires_at) <= nowMs) {
    status = "expired";
  } else if (used) {
    status = "used";
  }
  const path = `/c/${row.token}`;
  return {
    ...toPublic(row),
    id: row.id,
    path,
    url: `${resolvePublicSiteUrl()}${path}`,
    status,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    intentId,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function createCheckoutLink(input: {
  label: unknown;
  usdtAmount: unknown;
  country: unknown;
  currency: unknown;
  provider: unknown;
  msisdn: unknown;
  expiresHours: unknown;
  createdBy: string;
}): Promise<
  | { ok: true; checkout: CheckoutAdmin }
  | { ok: false; reason: string; status: number }
> {
  const amount = parseUsdtAmount(input.usdtAmount);
  if (!amount.ok) {
    return { ok: false, reason: amount.reason, status: 400 };
  }
  if (amount.amount <= 0) {
    return {
      ok: false,
      reason: "usdt amount must be greater than 0",
      status: 400,
    };
  }

  const country = normalizeCorridorCountry(input.country);
  if (!country.ok) {
    return { ok: false, reason: country.reason, status: 400 };
  }
  const currency = normalizeCorridorCurrency(input.currency);
  if (!currency.ok) {
    return { ok: false, reason: currency.reason, status: 400 };
  }
  const provider = normalizeCorridorProvider(input.provider);
  if (!provider.ok) {
    return { ok: false, reason: provider.reason, status: 400 };
  }

  const corridor = await loadCheckoutCorridor(
    country.country,
    currency.currency,
    provider.provider,
  );
  if (!corridor.ok) {
    return corridor;
  }

  const msisdn = normalizeMsisdnForCountry(
    input.msisdn,
    corridor.prefix,
    corridor.knownPrefixes,
  );
  if (!msisdn.ok) {
    return { ok: false, reason: msisdn.reason, status: 400 };
  }
  const label = parseCheckoutLabel(input.label);
  if (!label.ok) {
    return { ok: false, reason: label.reason, status: 400 };
  }
  const ttl = parseCheckoutTtlHours(input.expiresHours);
  if (!ttl.ok) {
    return { ok: false, reason: ttl.reason, status: 400 };
  }

  const expiresAt =
    ttl.hours === 0
      ? null
      : new Date(Date.now() + ttl.hours * 60 * 60 * 1000).toISOString();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("checkout_links")
    .insert({
      token: generateCheckoutToken(),
      label: label.label,
      usdt_amount: amount.amount,
      country: country.country,
      currency: currency.currency,
      provider: provider.provider,
      msisdn: msisdn.msisdn,
      expires_at: expiresAt,
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, reason: "unable to create checkout", status: 503 };
  }

  return { ok: true, checkout: toAdmin(data, null) };
}

export async function listCheckoutLinks(): Promise<
  | { ok: true; checkouts: CheckoutAdmin[] }
  | { ok: false; reason: string; status: number }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("checkout_links")
    .select()
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    return { ok: false, reason: "unable to load checkouts", status: 503 };
  }

  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
  const intentByCheckout = new Map<string, string>();
  if (ids.length > 0) {
    const intents = await supabase
      .from("payment_intents")
      .select("id, checkout_id")
      .in("checkout_id", ids);
    if (intents.error) {
      return { ok: false, reason: "unable to load checkouts", status: 503 };
    }
    for (const intent of intents.data ?? []) {
      if (intent.checkout_id) {
        intentByCheckout.set(intent.checkout_id, intent.id);
      }
    }
  }

  return {
    ok: true,
    checkouts: rows.map((row) =>
      toAdmin(row, intentByCheckout.get(row.id) ?? null),
    ),
  };
}

export async function revokeCheckoutLink(
  id: string,
): Promise<
  | { ok: true; checkout: CheckoutAdmin }
  | { ok: false; reason: string; status: number }
> {
  const supabase = createAdminClient();
  const { data: existing, error: loadError } = await supabase
    .from("checkout_links")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return { ok: false, reason: "unable to revoke checkout", status: 503 };
  }
  if (!existing) {
    return { ok: false, reason: "checkout not found", status: 404 };
  }

  const used = await loadCheckoutIntentId(existing.id);
  if (used) {
    return { ok: false, reason: "checkout already used", status: 409 };
  }

  const { data, error } = await supabase
    .from("checkout_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null)
    .select()
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unable to revoke checkout", status: 503 };
  }
  if (!data) {
    return { ok: false, reason: CHECKOUT_UNAVAILABLE, status: 409 };
  }

  return { ok: true, checkout: toAdmin(data, null) };
}

export async function loadPublicCheckout(
  token: string,
): Promise<
  | { ok: true; checkout: CheckoutPublic }
  | { ok: false; reason: string; status: number }
> {
  const parsed = normalizeCheckoutToken(token);
  if (!parsed.ok) {
    return { ok: false, reason: CHECKOUT_UNAVAILABLE, status: 404 };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("checkout_links")
    .select()
    .eq("token", parsed.token)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unable to load checkout", status: 503 };
  }
  if (!data) {
    return { ok: false, reason: CHECKOUT_UNAVAILABLE, status: 404 };
  }

  const intentId = await loadCheckoutIntentId(data.id);
  const availability = checkoutAvailability(data, Boolean(intentId));
  if (!availability.ok) {
    return availability;
  }

  return { ok: true, checkout: toPublic(data) };
}

export async function resolveCheckoutForIntent(input: {
  token: unknown;
  usdtAmount: number;
  country: string;
  currency: string;
  provider: string;
  msisdn: string;
}): Promise<
  | { ok: true; checkoutId: string }
  | { ok: false; reason: string; status: number }
> {
  const parsed = normalizeCheckoutToken(input.token);
  if (!parsed.ok) {
    return { ok: false, reason: "checkout is invalid", status: 400 };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("checkout_links")
    .select()
    .eq("token", parsed.token)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unable to load checkout", status: 503 };
  }
  if (!data) {
    return { ok: false, reason: CHECKOUT_UNAVAILABLE, status: 404 };
  }

  const intentId = await loadCheckoutIntentId(data.id);
  const availability = checkoutAvailability(data, Boolean(intentId));
  if (!availability.ok) {
    return availability;
  }

  const locks = checkoutLocksMatch(data, input);
  if (!locks.ok) {
    return { ok: false, reason: locks.reason, status: 409 };
  }

  return { ok: true, checkoutId: data.id };
}

async function loadCheckoutCorridor(
  country: string,
  currency: string,
  provider: string,
): Promise<
  | {
      ok: true;
      prefix: string;
      knownPrefixes: string[];
    }
  | { ok: false; reason: string; status: number }
> {
  const configured = getPawapayConfig();
  if (!configured.ok) {
    return { ok: false, reason: configured.reason, status: 503 };
  }

  const conf = await getActiveConf(configured.config, {
    operationType: "PAYOUT",
  });
  if (!conf.ok) {
    return { ok: false, reason: conf.reason, status: 503 };
  }

  const countries = listPayoutCountries(conf.data);
  const selected = countries.find((row) => row.country === country);
  if (!selected) {
    return {
      ok: false,
      reason: "no payout corridor for this country",
      status: 400,
    };
  }

  const providers = listPayoutProviders(conf.data, country);
  const match = providers.find(
    (row) => row.provider === provider && row.currency === currency,
  );
  if (!match) {
    return {
      ok: false,
      reason: "provider and currency do not match this country",
      status: 400,
    };
  }

  return {
    ok: true,
    prefix: selected.prefix,
    knownPrefixes: countries.map((row) => row.prefix),
  };
}

async function loadCheckoutIntentId(
  checkoutId: string,
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .select("id")
    .eq("checkout_id", checkoutId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data.id;
}
