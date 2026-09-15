import { randomUUID } from "node:crypto";

import {
  normalizeCorridorCountry,
  normalizeCorridorCurrency,
  normalizeCorridorProvider,
} from "@/lib/corridor";
import { normalizeMsisdnForCountry } from "@/lib/identity";
import { toNumber } from "@/lib/numbers";
import { formatPayoutAmount } from "@/lib/pawapay/amount";
import { assertDepositProviderOpen } from "@/lib/pawapay/availability-gate";
import { getActiveConf, initiateDeposit } from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";
import {
  listDepositCountries,
  listDepositProviders,
  pickDepositCorridor,
  type DepositCorridor,
} from "@/lib/pawapay/corridor";
import { mapPawapayPayoutStatus } from "@/lib/pawapay/status";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DepositCollectionRow } from "@/lib/supabase/types";

export type CollectionView = {
  id: string;
  depositId: string;
  label: string | null;
  country: string;
  currency: string;
  provider: string;
  msisdn: string;
  amount: number;
  status: DepositCollectionRow["status"];
  providerReason: string | null;
  createdBy: string;
  createdAt: string;
};

export async function listCollections(): Promise<
  | { ok: true; collections: CollectionView[] }
  | { ok: false; reason: string; status: number }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("deposit_collections")
    .select()
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { ok: false, reason: "unable to load collections", status: 503 };
  }

  return {
    ok: true,
    collections: (data ?? []).map(toCollectionView),
  };
}

export async function createCollection(input: {
  label: unknown;
  country: unknown;
  currency: unknown;
  provider: unknown;
  msisdn: unknown;
  amount: unknown;
  createdBy: string;
}): Promise<
  | { ok: true; collection: CollectionView }
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

  const label = parseLabel(input.label);
  if (!label.ok) {
    return { ok: false, reason: label.reason, status: 400 };
  }

  const corridor = await loadDepositCorridor(
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

  const amount = parseLocalAmount(input.amount);
  if (!amount.ok) {
    return { ok: false, reason: amount.reason, status: 400 };
  }
  const amountText = formatCollectionAmount(amount.amount, corridor.deposit);
  if (!amountText) {
    return {
      ok: false,
      reason: "amount is outside this provider min or max",
      status: 400,
    };
  }

  const available = await assertDepositProviderOpen(
    country.country,
    provider.provider,
  );
  if (!available.ok) {
    return available;
  }

  const depositId = randomUUID();
  const supabase = createAdminClient();
  const inserted = await supabase
    .from("deposit_collections")
    .insert({
      deposit_id: depositId,
      label: label.label,
      country: country.country,
      currency: currency.currency,
      provider: provider.provider,
      msisdn: msisdn.msisdn,
      amount: toNumber(amountText),
      status: "pending",
      created_by: input.createdBy,
    })
    .select()
    .maybeSingle();

  if (inserted.error || !inserted.data) {
    return { ok: false, reason: "unable to persist collection", status: 503 };
  }

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return {
      ok: false,
      reason: `${configured.reason}. collection saved as pending`,
      status: 503,
    };
  }

  const initiated = await initiateDeposit(configured.config, {
    depositId,
    amount: amountText,
    currency: currency.currency,
    clientReferenceId: inserted.data.id,
    payer: {
      type: "MMO",
      accountDetails: {
        phoneNumber: msisdn.msisdn,
        provider: provider.provider,
      },
    },
  });

  if (!initiated.ok) {
    return {
      ok: false,
      reason: `${initiated.reason}. collection saved as pending`,
      status: 503,
    };
  }

  if (initiated.data.status === "REJECTED") {
    await updateCollection(depositId, {
      status: "failed",
      providerReason: (
        initiated.data.failureReason?.failureCode ?? "rejected"
      ).slice(0, 240),
    });
  }

  const loaded = await loadCollection(depositId);
  if (!loaded.ok || !loaded.row) {
    return { ok: false, reason: "unable to load collection", status: 503 };
  }

  return { ok: true, collection: toCollectionView(loaded.row) };
}

export async function applyDepositCollectionUpdate(input: {
  depositId: string;
  status: DepositCollectionRow["status"];
  providerRef: string | null;
  providerReason: string | null;
}): Promise<
  | { ok: true; applied: boolean; status: DepositCollectionRow["status"] }
  | { ok: false; reason: string }
> {
  const loaded = await loadCollection(input.depositId);
  if (!loaded.ok) {
    return loaded;
  }
  if (!loaded.row) {
    return { ok: false, reason: "deposit not found" };
  }

  if (loaded.row.status === "successful" || loaded.row.status === "failed") {
    return {
      ok: true,
      applied: false,
      status: loaded.row.status,
    };
  }

  const updated = await updateCollection(input.depositId, {
    status: input.status,
    providerRef: input.providerRef,
    providerReason: input.providerReason,
  });
  if (!updated.ok) {
    return updated;
  }

  return {
    ok: true,
    applied: updated.applied,
    status: updated.applied ? input.status : loaded.row.status,
  };
}

export async function listOpenCollections(
  limit: number,
): Promise<{ ok: true; depositIds: string[] } | { ok: false; reason: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("deposit_collections")
    .select("deposit_id")
    .in("status", ["pending", "enqueued"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return { ok: false, reason: "unable to load collections" };
  }

  return {
    ok: true,
    depositIds: (data ?? []).map((row) => row.deposit_id),
  };
}

export function mapDepositCallbackStatus(
  value: unknown,
): DepositCollectionRow["status"] | null {
  return mapPawapayPayoutStatus(value);
}

async function loadCollection(
  depositId: string,
): Promise<
  { ok: true; row: DepositCollectionRow | null } | { ok: false; reason: string }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("deposit_collections")
    .select()
    .eq("deposit_id", depositId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unable to load collection" };
  }

  return { ok: true, row: data };
}

async function updateCollection(
  depositId: string,
  patch: {
    status: DepositCollectionRow["status"];
    providerRef?: string | null;
    providerReason?: string | null;
  },
): Promise<{ ok: true; applied: boolean } | { ok: false; reason: string }> {
  const supabase = createAdminClient();
  const updated = await supabase
    .from("deposit_collections")
    .update({
      status: patch.status,
      provider_ref: patch.providerRef ?? null,
      provider_reason: patch.providerReason ?? null,
    })
    .eq("deposit_id", depositId)
    .in("status", ["pending", "enqueued"])
    .select("deposit_id")
    .maybeSingle();

  if (updated.error) {
    return { ok: false, reason: "unable to update collection" };
  }

  return { ok: true, applied: Boolean(updated.data) };
}

function toCollectionView(row: DepositCollectionRow): CollectionView {
  return {
    id: row.id,
    depositId: row.deposit_id,
    label: row.label,
    country: row.country,
    currency: row.currency,
    provider: row.provider,
    msisdn: row.msisdn,
    amount: toNumber(row.amount),
    status: row.status,
    providerReason: row.provider_reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function parseLabel(
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

function parseLocalAmount(
  value: unknown,
): { ok: true; amount: number } | { ok: false; reason: string } {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return { ok: false, reason: "amount must be greater than 0" };
  }
  return { ok: true, amount: value };
}

function formatCollectionAmount(
  amount: number,
  corridor: DepositCorridor,
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

async function loadDepositCorridor(
  country: string,
  currency: string,
  provider: string,
): Promise<
  | {
      ok: true;
      prefix: string;
      knownPrefixes: string[];
      deposit: DepositCorridor;
    }
  | { ok: false; reason: string; status: number }
> {
  const configured = getPawapayConfig();
  if (!configured.ok) {
    return { ok: false, reason: configured.reason, status: 503 };
  }

  const conf = await getActiveConf(configured.config, {
    operationType: "DEPOSIT",
  });
  if (!conf.ok) {
    return { ok: false, reason: conf.reason, status: 503 };
  }

  const countries = listDepositCountries(conf.data);
  const selected = countries.find((row) => row.country === country);
  if (!selected) {
    return {
      ok: false,
      reason: "no deposit corridor for this country",
      status: 400,
    };
  }

  const providers = listDepositProviders(conf.data, country);
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

  const deposit = pickDepositCorridor(conf.data, { country, provider });
  if (!deposit || deposit.currency !== currency) {
    return {
      ok: false,
      reason: "deposit corridor is not configured",
      status: 400,
    };
  }

  return {
    ok: true,
    prefix: selected.prefix,
    knownPrefixes: countries.map((row) => row.prefix),
    deposit,
  };
}
