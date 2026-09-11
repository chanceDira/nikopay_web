import { randomUUID } from "node:crypto";

import {
  normalizeCorridorCountry,
  normalizeCorridorCurrency,
  normalizeCorridorProvider,
} from "@/lib/corridor";
import { isUuid, normalizeMsisdnForCountry } from "@/lib/identity";
import { toNumber } from "@/lib/numbers";
import { formatPayoutAmount } from "@/lib/pawapay/amount";
import { assertPayoutProviderOpen } from "@/lib/pawapay/availability-gate";
import { getActiveConf, initiateBulkPayouts } from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";
import {
  listPayoutCountries,
  listPayoutProviders,
  pickPayoutCorridor,
  type PayoutCorridor,
} from "@/lib/pawapay/corridor";
import { assertPayoutFunds } from "@/lib/pawapay/liquidity";
import { updatePayoutTransfer } from "@/lib/pawapay/transfers";
import type { InitiatePayoutResponse } from "@/lib/pawapay/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BulkPayoutBatchRow,
  PayoutTransferRow,
} from "@/lib/supabase/types";

export const BULK_PAYOUT_MAX = 20;

export function bulkItemCount(
  length: number,
): { ok: true } | { ok: false; reason: string } {
  if (!Number.isInteger(length) || length < 1 || length > BULK_PAYOUT_MAX) {
    return {
      ok: false,
      reason: `bulk payout must contain 1 to ${BULK_PAYOUT_MAX} items`,
    };
  }
  return { ok: true };
}

export type BulkPayoutItemInput = {
  msisdn: unknown;
  amount: unknown;
};

export type BulkPayoutItemView = {
  payoutId: string;
  msisdn: string;
  amount: number;
  status: PayoutTransferRow["status"];
  providerReason: string | null;
};

export type BulkPayoutBatchView = {
  id: string;
  label: string | null;
  country: string;
  currency: string;
  provider: string;
  itemCount: number;
  totalAmount: number;
  createdBy: string;
  createdAt: string;
  items: BulkPayoutItemView[];
};

export async function listBulkPayouts(): Promise<
  | { ok: true; batches: BulkPayoutBatchView[] }
  | { ok: false; reason: string; status: number }
> {
  const supabase = createAdminClient();
  const { data: batches, error } = await supabase
    .from("bulk_payout_batches")
    .select()
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { ok: false, reason: "unable to load bulk payouts", status: 503 };
  }

  const rows = batches ?? [];
  if (rows.length === 0) {
    return { ok: true, batches: [] };
  }

  const { data: items, error: itemsError } = await supabase
    .from("payout_transfers")
    .select()
    .in(
      "batch_id",
      rows.map((row) => row.id),
    )
    .order("created_at", { ascending: true });

  if (itemsError) {
    return { ok: false, reason: "unable to load bulk payouts", status: 503 };
  }

  return {
    ok: true,
    batches: rows.map((row) => toBatchView(row, items ?? [])),
  };
}

export async function createBulkPayout(input: {
  label: unknown;
  country: unknown;
  currency: unknown;
  provider: unknown;
  items: unknown;
  createdBy: string;
}): Promise<
  | { ok: true; batch: BulkPayoutBatchView }
  | { ok: false; reason: string; status: number }
> {
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

  const label = parseBulkLabel(input.label);
  if (!label.ok) {
    return { ok: false, reason: label.reason, status: 400 };
  }

  if (!Array.isArray(input.items)) {
    return { ok: false, reason: "items must be a list", status: 400 };
  }
  const count = bulkItemCount(input.items.length);
  if (!count.ok) {
    return { ok: false, reason: count.reason, status: 400 };
  }

  const corridor = await loadBulkCorridor(
    country.country,
    currency.currency,
    provider.provider,
  );
  if (!corridor.ok) {
    return corridor;
  }

  const prepared: Array<{
    payoutId: string;
    msisdn: string;
    amount: number;
    amountText: string;
  }> = [];

  for (const raw of input.items) {
    const item = asItem(raw);
    if (!item) {
      return {
        ok: false,
        reason: "each item needs a number and amount",
        status: 400,
      };
    }
    const msisdn = normalizeMsisdnForCountry(
      item.msisdn,
      corridor.prefix,
      corridor.knownPrefixes,
    );
    if (!msisdn.ok) {
      return { ok: false, reason: msisdn.reason, status: 400 };
    }
    const amount = parseLocalAmount(item.amount);
    if (!amount.ok) {
      return { ok: false, reason: amount.reason, status: 400 };
    }
    const amountText = formatBulkAmount(amount.amount, corridor.payout);
    if (!amountText) {
      return {
        ok: false,
        reason: "amount is outside this provider min or max",
        status: 400,
      };
    }
    prepared.push({
      payoutId: randomUUID(),
      msisdn: msisdn.msisdn,
      amount: toNumber(amountText),
      amountText,
    });
  }

  const total = prepared.reduce((sum, row) => sum + row.amount, 0);
  const funds = await assertPayoutFunds({
    country: country.country,
    currency: currency.currency,
    amount: total,
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

  const supabase = createAdminClient();
  const inserted = await supabase
    .from("bulk_payout_batches")
    .insert({
      label: label.label,
      country: country.country,
      currency: currency.currency,
      provider: provider.provider,
      created_by: input.createdBy,
    })
    .select()
    .maybeSingle();

  if (inserted.error || !inserted.data) {
    return { ok: false, reason: "unable to persist bulk payout", status: 503 };
  }

  const batch = inserted.data;
  const saved = await supabase.from("payout_transfers").insert(
    prepared.map((row) => ({
      intent_id: null,
      batch_id: batch.id,
      payout_id: row.payoutId,
      country: country.country,
      currency: currency.currency,
      provider: provider.provider,
      msisdn: row.msisdn,
      amount: row.amount,
      status: "pending" as const,
    })),
  );
  if (saved.error) {
    await supabase.from("bulk_payout_batches").delete().eq("id", batch.id);
    return { ok: false, reason: "unable to persist payout", status: 503 };
  }

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return {
      ok: false,
      reason: `${configured.reason}. batch saved as pending`,
      status: 503,
    };
  }

  const initiated = await initiateBulkPayouts(
    configured.config,
    prepared.map((row) => ({
      payoutId: row.payoutId,
      amount: row.amountText,
      currency: currency.currency,
      clientReferenceId: batch.id,
      recipient: {
        type: "MMO",
        accountDetails: {
          phoneNumber: row.msisdn,
          provider: provider.provider,
        },
      },
    })),
  );

  if (initiated.ok) {
    await markRejectedInitiations(initiated.data);
  }

  const listed = await listBulkPayouts();
  if (!listed.ok) {
    return listed;
  }
  const view = listed.batches.find((row) => row.id === batch.id);
  if (!view) {
    return { ok: false, reason: "unable to load bulk payout", status: 503 };
  }

  if (!initiated.ok) {
    return {
      ok: false,
      reason: `${initiated.reason}. batch saved as pending`,
      status: 503,
    };
  }

  return { ok: true, batch: view };
}

export async function retryBulkPayout(
  batchId: string,
): Promise<
  | { ok: true; batch: BulkPayoutBatchView }
  | { ok: false; reason: string; status: number }
> {
  if (!isUuid(batchId)) {
    return { ok: false, reason: "batch is invalid", status: 400 };
  }

  const supabase = createAdminClient();
  const { data: batch, error } = await supabase
    .from("bulk_payout_batches")
    .select()
    .eq("id", batchId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unable to load bulk payout", status: 503 };
  }
  if (!batch) {
    return { ok: false, reason: "batch not found", status: 404 };
  }

  const { data: items, error: itemsError } = await supabase
    .from("payout_transfers")
    .select()
    .eq("batch_id", batchId)
    .eq("status", "pending");

  if (itemsError) {
    return { ok: false, reason: "unable to load bulk payout", status: 503 };
  }
  if (!items || items.length === 0) {
    return { ok: false, reason: "no pending items to retry", status: 409 };
  }

  const corridor = await loadBulkCorridor(
    batch.country,
    batch.currency,
    batch.provider,
  );
  if (!corridor.ok) {
    return corridor;
  }

  const prepared: Array<{
    payoutId: string;
    msisdn: string;
    amountText: string;
  }> = [];
  for (const row of items) {
    const amountText = formatBulkAmount(toNumber(row.amount), corridor.payout);
    if (!amountText) {
      return {
        ok: false,
        reason: "amount is outside this provider min or max",
        status: 400,
      };
    }
    prepared.push({
      payoutId: row.payout_id,
      msisdn: row.msisdn,
      amountText,
    });
  }

  const total = prepared.reduce(
    (sum, row) => sum + toNumber(row.amountText),
    0,
  );
  const funds = await assertPayoutFunds({
    country: batch.country,
    currency: batch.currency,
    amount: total,
  });
  if (!funds.ok) {
    return funds;
  }

  const available = await assertPayoutProviderOpen(
    batch.country,
    batch.provider,
  );
  if (!available.ok) {
    return available;
  }

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return { ok: false, reason: configured.reason, status: 503 };
  }

  const initiated = await initiateBulkPayouts(
    configured.config,
    prepared.map((row) => ({
      payoutId: row.payoutId,
      amount: row.amountText,
      currency: batch.currency,
      clientReferenceId: batch.id,
      recipient: {
        type: "MMO" as const,
        accountDetails: {
          phoneNumber: row.msisdn,
          provider: batch.provider,
        },
      },
    })),
  );

  if (!initiated.ok) {
    return { ok: false, reason: initiated.reason, status: 503 };
  }

  await markRejectedInitiations(initiated.data);

  const listed = await listBulkPayouts();
  if (!listed.ok) {
    return listed;
  }
  const view = listed.batches.find((row) => row.id === batch.id);
  if (!view) {
    return { ok: false, reason: "unable to load bulk payout", status: 503 };
  }
  return { ok: true, batch: view };
}

async function markRejectedInitiations(
  rows: InitiatePayoutResponse[],
): Promise<void> {
  for (const row of rows) {
    if (row.status !== "REJECTED") {
      continue;
    }
    await updatePayoutTransfer(row.payoutId, {
      status: "failed",
      providerReason: (row.failureReason?.failureCode ?? "rejected").slice(
        0,
        240,
      ),
    });
  }
}

function toBatchView(
  batch: BulkPayoutBatchRow,
  items: PayoutTransferRow[],
): BulkPayoutBatchView {
  const rows = items.filter((row) => row.batch_id === batch.id);
  return {
    id: batch.id,
    label: batch.label,
    country: batch.country,
    currency: batch.currency,
    provider: batch.provider,
    itemCount: rows.length,
    totalAmount: rows.reduce((sum, row) => sum + toNumber(row.amount), 0),
    createdBy: batch.created_by,
    createdAt: batch.created_at,
    items: rows.map((row) => ({
      payoutId: row.payout_id,
      msisdn: row.msisdn,
      amount: toNumber(row.amount),
      status: row.status,
      providerReason: row.provider_reason,
    })),
  };
}

function parseBulkLabel(
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

function asItem(value: unknown): BulkPayoutItemInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  return { msisdn: row.msisdn, amount: row.amount };
}

function parseLocalAmount(
  value: unknown,
): { ok: true; amount: number } | { ok: false; reason: string } {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return { ok: false, reason: "amount must be greater than 0" };
  }
  return { ok: true, amount: value };
}

function formatBulkAmount(
  amount: number,
  corridor: PayoutCorridor,
): string | null {
  const formatted = formatPayoutAmount(amount, corridor.decimalsInAmount);
  if (!formatted) {
    return null;
  }
  const value = toNumber(formatted);
  const min = toNumber(corridor.minAmount);
  const max = toNumber(corridor.maxAmount);
  if (value < min || value > max) {
    return null;
  }
  return formatted;
}

async function loadBulkCorridor(
  country: string,
  currency: string,
  provider: string,
): Promise<
  | {
      ok: true;
      prefix: string;
      knownPrefixes: string[];
      payout: PayoutCorridor;
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

  const payout = pickPayoutCorridor(conf.data, { country, provider });
  if (!payout || payout.currency !== currency) {
    return {
      ok: false,
      reason: "payout corridor is not configured",
      status: 400,
    };
  }

  return {
    ok: true,
    prefix: selected.prefix,
    knownPrefixes: countries.map((row) => row.prefix),
    payout,
  };
}
