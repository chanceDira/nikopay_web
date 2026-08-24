import {
  normalizeMsisdn,
  normalizeOptionalEmail,
  normalizeWalletAddress,
} from "@/lib/identity";
import { isMomoPayoutStatus } from "@/lib/admin-payouts";
import { toNumber } from "@/lib/numbers";
import { createServerQuote } from "@/lib/quotes";
import { isPaymentStatus } from "@/lib/settlement/intent-status";
import {
  isChainId,
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

  return {
    id: row.id,
    status: row.status,
    chain: row.chain_id,
    walletAddress: row.wallet_address,
    msisdn: row.msisdn,
    usdtAmount: toNumber(row.usdt_amount),
    rate: toNumber(row.rate),
    feePercent: toNumber(row.fee_percent),
    feeRwf: toNumber(row.fee_rwf),
    netRwf: toNumber(row.net_rwf),
    treasuryAddress: row.treasury_address,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    depositTx: row.deposit_tx ?? undefined,
    momoRef: row.momo_ref ?? undefined,
    notifyEmail: row.notify_email ?? undefined,
    payout,
  };
}

export async function createPaymentIntent(input: {
  usdtAmount: number;
  chain: unknown;
  msisdn: unknown;
  walletAddress: unknown;
  notifyEmail?: unknown;
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

  const notifyEmail = normalizeOptionalEmail(input.notifyEmail);
  if (!notifyEmail.ok) {
    return { ok: false, reason: notifyEmail.reason, status: 400 };
  }

  const quoted = await createServerQuote(input.usdtAmount, input.chain);
  if (!quoted.ok) {
    return quoted;
  }

  const treasury = await loadActiveTreasury(quoted.quote.chain);
  if (!treasury.ok) {
    return { ok: false, reason: treasury.reason, status: 409 };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .insert({
      wallet_address: wallet.address,
      status: "awaiting_payment",
      chain_id: quoted.quote.chain,
      msisdn: msisdn.msisdn,
      usdt_amount: quoted.quote.usdtAmount,
      rate: quoted.quote.rate,
      fee_percent: quoted.quote.feePercent,
      fee_rwf: quoted.quote.feeRwf,
      net_rwf: quoted.quote.netRwf,
      treasury_address: treasury.address,
      expires_at: quoted.quote.expiresAt,
      notify_email: notifyEmail.email,
    })
    .select()
    .single();

  if (error || !data) {
    return {
      ok: false,
      reason: "unable to create payment intent",
      status: 503,
    };
  }

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
  const { data, error } = await supabase
    .from("momo_transfers")
    .select("status, reference_id, provider_ref, provider_reason, updated_at")
    .eq("intent_id", intentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || !isMomoPayoutStatus(data.status)) {
    return undefined;
  }

  return {
    status: data.status,
    referenceId: data.reference_id,
    providerRef: data.provider_ref ?? undefined,
    providerReason: data.provider_reason ?? undefined,
    updatedAt: data.updated_at,
  };
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
