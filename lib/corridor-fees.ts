import {
  normalizeCorridorCountry,
  normalizeCorridorCurrency,
  normalizeCorridorProvider,
} from "@/lib/corridor";
import { toNumber } from "@/lib/numbers";
import { fallbackCorridorFees } from "@/lib/settlement/corridor-fee-defaults";
import { type CorridorFees } from "@/lib/settlement/quote";
import { createAdminClient } from "@/lib/supabase/admin";

export type CorridorFeeRow = {
  id: string;
  country: string;
  currency: string;
  provider: string | null;
  pawapayPercent: number;
  mnoFixed: number;
  updatedAt: string;
};

function toFees(
  pawapayPercent: number,
  mnoFixed: number,
  nikopayPercent: number,
): CorridorFees {
  return { pawapayPercent, mnoFixed, nikopayPercent };
}

export function defaultCorridorFees(
  nikopayPercent: number,
  country?: string,
  provider?: string,
  currency = "RWF",
): CorridorFees {
  return fallbackCorridorFees({
    currency,
    nikopayPercent,
    country,
    provider,
  });
}

export async function loadCorridorFees(input: {
  currency: string;
  nikopayPercent: number;
  country?: string;
  provider?: string;
}): Promise<CorridorFees> {
  const currency = normalizeCorridorCurrency(input.currency);
  if (!currency.ok) {
    return defaultCorridorFees(input.nikopayPercent);
  }

  const fallback = fallbackCorridorFees({
    currency: currency.currency,
    nikopayPercent: input.nikopayPercent,
    country: input.country,
    provider: input.provider,
  });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("corridor_fee_schedules")
    .select("country, currency, provider, pawapay_percent, mno_fixed")
    .eq("currency", currency.currency);

  if (error || !data || data.length === 0) {
    return fallback;
  }

  const country = input.country
    ? normalizeCorridorCountry(input.country)
    : null;
  const provider = input.provider
    ? normalizeCorridorProvider(input.provider)
    : null;

  const rows = data.map((row) => ({
    country: row.country,
    provider: row.provider,
    pawapayPercent: toNumber(row.pawapay_percent),
    mnoFixed: toNumber(row.mno_fixed),
  }));

  if (country?.ok && provider?.ok) {
    const exact = rows.find(
      (row) =>
        row.country === country.country && row.provider === provider.provider,
    );
    if (exact) {
      return toFees(exact.pawapayPercent, exact.mnoFixed, input.nikopayPercent);
    }
  }

  if (country?.ok) {
    const countryDefault = rows.find(
      (row) => row.country === country.country && row.provider == null,
    );
    if (countryDefault) {
      return toFees(
        countryDefault.pawapayPercent,
        countryDefault.mnoFixed,
        input.nikopayPercent,
      );
    }
  }

  const currencyDefault = rows.find((row) => row.provider == null);
  if (currencyDefault) {
    return toFees(
      currencyDefault.pawapayPercent,
      currencyDefault.mnoFixed,
      input.nikopayPercent,
    );
  }

  return fallback;
}

export async function listCorridorFeeSchedules(): Promise<
  { ok: true; rows: CorridorFeeRow[] } | { ok: false; reason: string }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("corridor_fee_schedules")
    .select(
      "id, country, currency, provider, pawapay_percent, mno_fixed, updated_at",
    )
    .order("country", { ascending: true })
    .order("provider", { ascending: true, nullsFirst: true });

  if (error) {
    return { ok: false, reason: "unable to load corridor fees" };
  }

  return {
    ok: true,
    rows: (data ?? []).map((row) => ({
      id: row.id,
      country: row.country,
      currency: row.currency,
      provider: row.provider,
      pawapayPercent: toNumber(row.pawapay_percent),
      mnoFixed: toNumber(row.mno_fixed),
      updatedAt: row.updated_at,
    })),
  };
}

export async function upsertCorridorFeeSchedule(input: {
  country: string;
  currency: string;
  provider: string | null;
  pawapayPercent: number;
  mnoFixed: number;
}): Promise<
  | { ok: true; row: CorridorFeeRow }
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

  let provider: string | null = null;
  if (input.provider) {
    const parsed = normalizeCorridorProvider(input.provider);
    if (!parsed.ok) {
      return { ok: false, reason: parsed.reason, status: 400 };
    }
    provider = parsed.provider;
  }

  if (
    !Number.isFinite(input.pawapayPercent) ||
    input.pawapayPercent < 0 ||
    input.pawapayPercent >= 100
  ) {
    return {
      ok: false,
      reason: "pawapay percent must be 0 to 99",
      status: 400,
    };
  }
  if (!Number.isFinite(input.mnoFixed) || input.mnoFixed < 0) {
    return {
      ok: false,
      reason: "mno fee must be zero or positive",
      status: 400,
    };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("corridor_fee_schedules")
    .upsert(
      {
        country: country.country,
        currency: currency.currency,
        provider,
        pawapay_percent: input.pawapayPercent,
        mno_fixed: input.mnoFixed,
      },
      { onConflict: "country,currency,provider" },
    )
    .select(
      "id, country, currency, provider, pawapay_percent, mno_fixed, updated_at",
    )
    .single();

  if (error || !data) {
    return { ok: false, reason: "unable to save corridor fees", status: 503 };
  }

  return {
    ok: true,
    row: {
      id: data.id,
      country: data.country,
      currency: data.currency,
      provider: data.provider,
      pawapayPercent: toNumber(data.pawapay_percent),
      mnoFixed: toNumber(data.mno_fixed),
      updatedAt: data.updated_at,
    },
  };
}
