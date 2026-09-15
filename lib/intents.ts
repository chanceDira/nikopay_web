import {
  normalizeMsisdn,
  normalizeOptionalEmail,
  normalizeWalletAddress,
} from "@/lib/identity";
import {
  normalizeCorridorCountry,
  normalizeCorridorCurrency,
  normalizeCorridorProvider,
} from "@/lib/corridor";
import { toNumber } from "@/lib/numbers";
import { allocatePayUsdt } from "@/lib/settlement/pay-usdt";
import { payoutRefAlias } from "@/lib/payout-ref";
import { assertPayoutProviderOpen } from "@/lib/pawapay/availability-gate";
import { assertPayoutFunds } from "@/lib/pawapay/liquidity";
import { createServerQuote } from "@/lib/quotes";
import { resolveCheckoutForIntent } from "@/lib/checkouts";
import { isPaymentStatus } from "@/lib/settlement/intent-status";
import {
  isChainId,
  type ChainId,
  type IntentPayout,
  type PaymentIntent,
} from "@/lib/settlement/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentIntentRow } from "@/lib/supabase/types";
import { loadActiveTreasury } from "@/lib/treasury";

const LIST_LIMIT = 50;

export function toPaymentIntent(
  row: PaymentIntentRow,
  payout?: IntentPayout,
): PaymentIntent | null {
  if (!isChainId(row.chain_id) || !isPaymentStatus(row.status)) {
    return null;
  }

  const usdtAmount = toNumber(row.usdt_amount);
  const payUsdt = toNumber(row.pay_usdt);
  if (!Number.isFinite(usdtAmount) || !Number.isFinite(payUsdt)) {
    return null;
  }

  return {
    id: row.id,
    status: row.status,
    chain: row.chain_id,
    walletAddress: row.wallet_address,
    msisdn: row.msisdn,
    country: row.country,
    currency: row.currency,
    provider: row.provider,
    usdtAmount,
    payUsdt,
    rate: toNumber(row.rate),
    feePercent: toNumber(row.fee_percent),
    feeRwf: toNumber(row.fee_rwf),
    netRwf: toNumber(row.net_rwf),
    pawapayPercent: optionalStoredNumber(row.pawapay_percent),
    mnoFixed: optionalStoredNumber(row.mno_fee_local),
    pawapayFeeLocal: optionalStoredNumber(row.pawapay_fee_local),
    mnoFeeLocal: optionalStoredNumber(row.mno_fee_local),
    nikopayFeeLocal: optionalStoredNumber(row.nikopay_fee_local),
    grossLocal: optionalStoredNumber(row.gross_local),
    treasuryAddress: row.treasury_address,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    detectedAt: row.detected_at ?? undefined,
    creditedAt: row.credited_at ?? undefined,
    payoutStartedAt: row.payout_started_at ?? undefined,
    paidAt: row.paid_at ?? undefined,
    depositTx: row.deposit_tx ?? undefined,
    ...payoutRefAlias(row.momo_ref),
    notifyEmail: row.notify_email ?? undefined,
    payout,
  };
}

export async function createPaymentIntent(input: {
  usdtAmount: number;
  netLocal?: number;
  chain: unknown;
  msisdn: unknown;
  walletAddress: unknown;
  country: unknown;
  currency: unknown;
  provider: unknown;
  notifyEmail?: unknown;
  checkoutToken?: unknown;
}): Promise<
  | { ok: true; intent: PaymentIntent }
  | { ok: false; reason: string; status: number }
> {
  const wallet = normalizeWalletAddress(input.walletAddress);
  if (!wallet.ok) {
    return { ok: false, reason: wallet.reason, status: 400 };
  }

  const msisdn = normalizeMsisdn(input.msisdn);
  if (!msisdn.ok) {
    return { ok: false, reason: msisdn.reason, status: 400 };
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

  const notifyEmail = normalizeOptionalEmail(input.notifyEmail);
  if (!notifyEmail.ok) {
    return { ok: false, reason: notifyEmail.reason, status: 400 };
  }

  const quoted = await createServerQuote({
    usdtAmount: input.netLocal != null ? undefined : input.usdtAmount,
    netLocal: input.netLocal,
    chain: input.chain,
    currency: currency.currency,
    country: country.country,
    provider: provider.provider,
  });
  if (!quoted.ok) {
    return quoted;
  }

  if (quoted.quote.currency !== currency.currency) {
    return {
      ok: false,
      reason: "quote currency does not match corridor",
      status: 409,
    };
  }

  const funds = await assertPayoutFunds({
    country: country.country,
    currency: currency.currency,
    amount: quoted.quote.netRwf,
  });
  if (!funds.ok) {
    return funds;
  }

  const available = await assertPayoutProviderOpen(
    country.country,
    provider.provider,
  );
  if (!available.ok) {
    return available;
  }

  let checkoutId: string | undefined;
  if (input.checkoutToken !== undefined && input.checkoutToken !== null) {
    const checkout = await resolveCheckoutForIntent({
      token: input.checkoutToken,
      usdtAmount: quoted.quote.usdtAmount,
    });
    if (!checkout.ok) {
      return checkout;
    }
    checkoutId = checkout.checkoutId;
  }

  const treasury = await loadActiveTreasury(quoted.quote.chain);
  if (!treasury.ok) {
    return { ok: false, reason: treasury.reason, status: 409 };
  }

  const supabase = createAdminClient();
  const created = await insertOpenIntent({
    supabase,
    chain: quoted.quote.chain,
    treasuryAddress: treasury.address,
    quotedAmount: quoted.quote.usdtAmount,
    row: {
      wallet_address: wallet.address,
      status: "awaiting_payment",
      chain_id: quoted.quote.chain,
      msisdn: msisdn.msisdn,
      country: country.country,
      currency: currency.currency,
      provider: provider.provider,
      usdt_amount: quoted.quote.usdtAmount,
      rate: quoted.quote.rate,
      fee_percent: quoted.quote.feePercent,
      fee_rwf: quoted.quote.feeRwf,
      net_rwf: quoted.quote.netRwf,
      pawapay_fee_local: quoted.quote.pawapayFeeLocal,
      mno_fee_local: quoted.quote.mnoFeeLocal,
      nikopay_fee_local: quoted.quote.nikopayFeeLocal,
      gross_local: quoted.quote.grossLocal,
      pawapay_percent: quoted.quote.pawapayPercent,
      treasury_address: treasury.address,
      expires_at: quoted.quote.expiresAt,
      notify_email: notifyEmail.email,
      checkout_id: checkoutId ?? null,
    },
    checkoutId,
  });
  if (!created.ok) {
    return created;
  }

  return { ok: true, intent: created.intent };
}

async function insertOpenIntent(input: {
  supabase: ReturnType<typeof createAdminClient>;
  chain: ChainId;
  treasuryAddress: string;
  quotedAmount: number;
  checkoutId?: string;
  row: {
    wallet_address: string;
    status: "awaiting_payment";
    chain_id: ChainId;
    msisdn: string;
    country: string;
    currency: string;
    provider: string;
    usdt_amount: number;
    rate: number;
    fee_percent: number;
    fee_rwf: number;
    net_rwf: number;
    pawapay_fee_local?: number | null;
    mno_fee_local?: number | null;
    nikopay_fee_local?: number | null;
    gross_local?: number | null;
    pawapay_percent?: number | null;
    treasury_address: string;
    expires_at: string;
    notify_email: string | null;
    checkout_id: string | null;
  };
}): Promise<
  | { ok: true; intent: PaymentIntent }
  | { ok: false; reason: string; status: number }
> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await listOpenPayUsdt(
      input.supabase,
      input.chain,
      input.treasuryAddress,
    );
    if (!taken.ok) {
      return taken;
    }

    const allocated = allocatePayUsdt(input.quotedAmount, taken.amounts);
    if (!allocated.ok) {
      return { ok: false, reason: allocated.reason, status: 409 };
    }

    const { data, error } = await input.supabase
      .from("payment_intents")
      .insert({
        ...input.row,
        pay_usdt: allocated.payUsdt,
      })
      .select()
      .single();

    if (!error && data) {
      const intent = toPaymentIntent(data);
      if (!intent) {
        return {
          ok: false,
          reason: "unable to create payment intent",
          status: 503,
        };
      }
      return { ok: true, intent };
    }

    if (error?.code === "23505") {
      if (isCheckoutUniqueConflict(error, input.checkoutId)) {
        return {
          ok: false,
          reason: "This checkout is no longer available.",
          status: 409,
        };
      }
      continue;
    }

    return {
      ok: false,
      reason: "unable to create payment intent",
      status: 503,
    };
  }

  return {
    ok: false,
    reason: "unable to create payment intent",
    status: 503,
  };
}

async function listOpenPayUsdt(
  supabase: ReturnType<typeof createAdminClient>,
  chain: ChainId,
  treasuryAddress: string,
): Promise<
  | { ok: true; amounts: number[] }
  | { ok: false; reason: string; status: number }
> {
  const { data, error } = await supabase
    .from("payment_intents")
    .select("pay_usdt")
    .eq("chain_id", chain)
    .eq("status", "awaiting_payment")
    .eq("treasury_address", treasuryAddress);

  if (error) {
    return {
      ok: false,
      reason: "unable to create payment intent",
      status: 503,
    };
  }

  return {
    ok: true,
    amounts: (data ?? []).map((row) => toNumber(row.pay_usdt)),
  };
}

function isCheckoutUniqueConflict(
  error: { message?: string; details?: string },
  checkoutId?: string,
): boolean {
  if (!checkoutId) {
    return false;
  }
  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return text.includes("checkout");
}

export async function getPaymentIntent(
  id: string,
): Promise<
  | { ok: true; intent: PaymentIntent }
  | { ok: false; reason: string; status: number }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unable to load payment intent", status: 503 };
  }

  if (!data) {
    return { ok: false, reason: "payment intent not found", status: 404 };
  }

  const intent = toPaymentIntent(data);
  if (!intent) {
    return { ok: false, reason: "unable to load payment intent", status: 503 };
  }

  const payout = await loadIntentPayout(id);
  return { ok: true, intent: { ...intent, payout } };
}

async function loadIntentPayout(
  intentId: string,
): Promise<IntentPayout | undefined> {
  const supabase = createAdminClient();

  const pawapay = await supabase
    .from("payout_transfers")
    .select("status, payout_id, provider_ref, provider_reason, updated_at")
    .eq("intent_id", intentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pawapay.error || !pawapay.data) {
    return undefined;
  }

  const status = toIntentPayoutStatus(pawapay.data.status);
  if (!status) {
    return undefined;
  }

  return {
    status,
    referenceId: pawapay.data.payout_id,
    providerRef: pawapay.data.provider_ref ?? undefined,
    providerReason: pawapay.data.provider_reason ?? undefined,
    updatedAt: pawapay.data.updated_at,
  };
}

function toIntentPayoutStatus(
  status: string,
): IntentPayout["status"] | undefined {
  if (
    status === "successful" ||
    status === "failed" ||
    status === "pending" ||
    status === "enqueued"
  ) {
    return status;
  }
  return undefined;
}

export async function listPaymentIntents(
  walletAddress: unknown,
): Promise<
  | { ok: true; intents: PaymentIntent[] }
  | { ok: false; reason: string; status: number }
> {
  const wallet = normalizeWalletAddress(walletAddress);
  if (!wallet.ok) {
    return { ok: false, reason: wallet.reason, status: 400 };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .select()
    .eq("wallet_address", wallet.address)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (error) {
    return { ok: false, reason: "unable to load payment intents", status: 503 };
  }

  const intents: PaymentIntent[] = [];
  for (const row of data ?? []) {
    const intent = toPaymentIntent(row);
    if (intent) {
      intents.push(intent);
    }
  }

  return { ok: true, intents };
}

function optionalStoredNumber(value: unknown): number | undefined {
  const parsed = toNumber(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
