import { randomUUID } from "node:crypto";

import {
  normalizeCorridorCountry,
  normalizeCorridorCurrency,
  normalizeCorridorProvider,
} from "@/lib/corridor";
import { normalizeMsisdnForCountry, stripPhoneDigits } from "@/lib/identity";
import { asRecord } from "@/lib/http";
import { toNumber } from "@/lib/numbers";
import { formatPayoutAmount } from "@/lib/pawapay/amount";
import { assertPayoutProviderOpen } from "@/lib/pawapay/availability-gate";
import { getActiveConf, initiateRemittance } from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";
import {
  listRemittanceCountries,
  listRemittanceProviders,
  pickRemittanceCorridor,
  type PayoutCorridor,
} from "@/lib/pawapay/corridor";
import { assertPayoutFunds } from "@/lib/pawapay/liquidity";
import { mapPawapayPayoutStatus } from "@/lib/pawapay/status";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database";
import type { RemittanceRow } from "@/lib/supabase/types";

const PURPOSE_OF_FUNDS = [
  "FAMILY_SUPPORT",
  "MEDICAL_EXPENSES",
  "TUITION_FEES",
  "EDUCATION_SUPPORT",
  "GIFT_AND_OTHER_DONATIONS",
  "HOME_IMPROVEMENT",
  "DEBT_SETTLEMENT",
  "REAL_ESTATE",
  "TAXES",
  "SALARY",
  "SAVINGS",
  "PERSONAL_TRANSFER",
  "OTHER",
] as const;

const SOURCE_OF_FUNDS = [
  "SALARY",
  "SAVINGS",
  "LOTTERY",
  "LOAN",
  "BUSINESS_INCOME",
  "GIFT",
  "OTHER",
] as const;

const IDENTIFICATION_TYPES = [
  "NATIONAL_ID",
  "PASSPORT",
  "DRIVING_LICENSE",
  "SOCIAL_SECURITY_ID",
  "RESIDENCE_PERMIT",
] as const;

type PurposeOfFunds = (typeof PURPOSE_OF_FUNDS)[number];
type SourceOfFunds = (typeof SOURCE_OF_FUNDS)[number];
type IdentificationType = (typeof IDENTIFICATION_TYPES)[number];

export type RemittanceRecipientDetails = {
  firstName: string;
  lastName: string;
};

export type RemittanceSenderDetails = {
  firstName: string;
  lastName: string;
  nationality: string;
  phoneNumber: string;
  address: {
    addressLine: string;
    postalCode: string;
    city: string;
    country: string;
  };
  identification: {
    type: IdentificationType;
    number: string;
  };
};

export type RemittanceTransactionDetails = {
  transactionReference: string;
  originalAmount: string;
  originalCurrency: string;
  buyFxRate: string;
  senderFees: string;
  purposeOfFunds: PurposeOfFunds;
  sourceOfFunds: SourceOfFunds;
};

export type RemittanceView = {
  id: string;
  remittanceId: string;
  label: string | null;
  amount: number;
  currency: string;
  recipientCountry: string;
  recipientProvider: string;
  recipientMsisdn: string;
  recipientDetails: RemittanceRecipientDetails;
  senderDetails: RemittanceSenderDetails;
  transactionDetails: RemittanceTransactionDetails;
  status: RemittanceRow["status"];
  providerReason: string | null;
  createdBy: string;
  createdAt: string;
};

export async function listRemittances(): Promise<
  | { ok: true; remittances: RemittanceView[] }
  | { ok: false; reason: string; status: number }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("remittances")
    .select()
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { ok: false, reason: "unable to load remittances", status: 503 };
  }

  return {
    ok: true,
    remittances: (data ?? []).map(toRemittanceView),
  };
}

export async function createRemittance(input: {
  label: unknown;
  country: unknown;
  currency: unknown;
  provider: unknown;
  msisdn: unknown;
  amount: unknown;
  recipient: unknown;
  sender: unknown;
  transaction: unknown;
  createdBy: string;
}): Promise<
  | { ok: true; remittance: RemittanceView }
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

  const recipientDetails = parseRecipientDetails(input.recipient);
  if (!recipientDetails.ok) {
    return { ok: false, reason: recipientDetails.reason, status: 400 };
  }

  const senderDetails = parseSenderDetails(input.sender);
  if (!senderDetails.ok) {
    return { ok: false, reason: senderDetails.reason, status: 400 };
  }

  const corridor = await loadRemittanceCorridor(
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
  const amountText = formatRemittanceAmount(amount.amount, corridor.payout);
  if (!amountText) {
    return {
      ok: false,
      reason: "amount is outside this provider min or max",
      status: 400,
    };
  }

  const remittanceId = randomUUID();
  const transactionDetails = parseTransactionDetails(
    input.transaction,
    remittanceId,
  );
  if (!transactionDetails.ok) {
    return { ok: false, reason: transactionDetails.reason, status: 400 };
  }

  const funds = await assertPayoutFunds({
    country: country.country,
    currency: currency.currency,
    amount: toNumber(amountText),
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
    .from("remittances")
    .insert({
      remittance_id: remittanceId,
      label: label.label,
      amount: toNumber(amountText),
      currency: currency.currency,
      recipient_country: country.country,
      recipient_provider: provider.provider,
      recipient_msisdn: msisdn.msisdn,
      recipient_details: recipientDetails.details as Json,
      sender_details: senderDetails.details as Json,
      transaction_details: transactionDetails.details as Json,
      status: "pending",
      created_by: input.createdBy,
    })
    .select()
    .maybeSingle();

  if (inserted.error || !inserted.data) {
    return { ok: false, reason: "unable to persist remittance", status: 503 };
  }

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return {
      ok: false,
      reason: `${configured.reason}. remittance saved as pending`,
      status: 503,
    };
  }

  const initiated = await initiateRemittance(configured.config, {
    remittanceId,
    amount: amountText,
    currency: currency.currency,
    recipient: {
      type: "MMO",
      accountDetails: {
        phoneNumber: msisdn.msisdn,
        provider: provider.provider,
      },
      recipientDetails: {
        firstName: recipientDetails.details.firstName,
        lastName: recipientDetails.details.lastName,
      },
    },
    sender: {
      transactionDetails: transactionDetails.details,
      senderDetails: senderDetails.details,
    },
  });

  if (!initiated.ok) {
    return {
      ok: false,
      reason: `${initiated.reason}. remittance saved as pending`,
      status: 503,
    };
  }

  if (initiated.data.status === "REJECTED") {
    await updateRemittance(remittanceId, {
      status: "failed",
      providerReason: (
        initiated.data.failureReason?.failureCode ?? "rejected"
      ).slice(0, 240),
    });
  }

  const loaded = await loadRemittance(remittanceId);
  if (!loaded.ok || !loaded.row) {
    return { ok: false, reason: "unable to load remittance", status: 503 };
  }

  return { ok: true, remittance: toRemittanceView(loaded.row) };
}

export async function applyRemittanceUpdate(input: {
  remittanceId: string;
  status: RemittanceRow["status"];
  providerRef: string | null;
  providerReason: string | null;
}): Promise<
  | { ok: true; applied: boolean; status: RemittanceRow["status"] }
  | { ok: false; reason: string }
> {
  const loaded = await loadRemittance(input.remittanceId);
  if (!loaded.ok) {
    return loaded;
  }
  if (!loaded.row) {
    return { ok: false, reason: "remittance not found" };
  }

  if (loaded.row.status === "successful" || loaded.row.status === "failed") {
    return {
      ok: true,
      applied: false,
      status: loaded.row.status,
    };
  }

  const updated = await updateRemittance(input.remittanceId, {
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

export function mapRemittanceCallbackStatus(
  value: unknown,
): RemittanceRow["status"] | null {
  return mapPawapayPayoutStatus(value);
}

async function loadRemittance(
  remittanceId: string,
): Promise<
  { ok: true; row: RemittanceRow | null } | { ok: false; reason: string }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("remittances")
    .select()
    .eq("remittance_id", remittanceId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unable to load remittance" };
  }

  return { ok: true, row: data };
}

async function updateRemittance(
  remittanceId: string,
  patch: {
    status: RemittanceRow["status"];
    providerRef?: string | null;
    providerReason?: string | null;
  },
): Promise<{ ok: true; applied: boolean } | { ok: false; reason: string }> {
  const supabase = createAdminClient();
  const updated = await supabase
    .from("remittances")
    .update({
      status: patch.status,
      provider_ref: patch.providerRef ?? null,
      provider_reason: patch.providerReason ?? null,
    })
    .eq("remittance_id", remittanceId)
    .in("status", ["pending", "enqueued"])
    .select("remittance_id")
    .maybeSingle();

  if (updated.error) {
    return { ok: false, reason: "unable to update remittance" };
  }

  return { ok: true, applied: Boolean(updated.data) };
}

function toRemittanceView(row: RemittanceRow): RemittanceView {
  return {
    id: row.id,
    remittanceId: row.remittance_id,
    label: row.label,
    amount: toNumber(row.amount),
    currency: row.currency,
    recipientCountry: row.recipient_country,
    recipientProvider: row.recipient_provider,
    recipientMsisdn: row.recipient_msisdn,
    recipientDetails: asRecipientDetails(row.recipient_details),
    senderDetails: asSenderDetails(row.sender_details),
    transactionDetails: asTransactionDetails(row.transaction_details),
    status: row.status,
    providerReason: row.provider_reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function asRecipientDetails(value: Json): RemittanceRecipientDetails {
  const record = asRecord(value);
  return {
    firstName: asTrimmedString(record?.firstName) ?? "",
    lastName: asTrimmedString(record?.lastName) ?? "",
  };
}

function asSenderDetails(value: Json): RemittanceSenderDetails {
  const record = asRecord(value);
  const address = asRecord(record?.address);
  const identification = asRecord(record?.identification);
  return {
    firstName: asTrimmedString(record?.firstName) ?? "",
    lastName: asTrimmedString(record?.lastName) ?? "",
    nationality: asTrimmedString(record?.nationality) ?? "",
    phoneNumber: asTrimmedString(record?.phoneNumber) ?? "",
    address: {
      addressLine: asTrimmedString(address?.addressLine) ?? "",
      postalCode: asTrimmedString(address?.postalCode) ?? "",
      city: asTrimmedString(address?.city) ?? "",
      country: asTrimmedString(address?.country) ?? "",
    },
    identification: {
      type: (asTrimmedString(identification?.type) ??
        "PASSPORT") as IdentificationType,
      number: asTrimmedString(identification?.number) ?? "",
    },
  };
}

function asTransactionDetails(value: Json): RemittanceTransactionDetails {
  const record = asRecord(value);
  return {
    transactionReference: asTrimmedString(record?.transactionReference) ?? "",
    originalAmount: asTrimmedString(record?.originalAmount) ?? "",
    originalCurrency: asTrimmedString(record?.originalCurrency) ?? "",
    buyFxRate: asTrimmedString(record?.buyFxRate) ?? "",
    senderFees: asTrimmedString(record?.senderFees) ?? "",
    purposeOfFunds: (asTrimmedString(record?.purposeOfFunds) ??
      "PERSONAL_TRANSFER") as PurposeOfFunds,
    sourceOfFunds: (asTrimmedString(record?.sourceOfFunds) ??
      "OTHER") as SourceOfFunds,
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

function formatRemittanceAmount(
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

function parseRecipientDetails(
  value: unknown,
):
  | { ok: true; details: RemittanceRecipientDetails }
  | { ok: false; reason: string } {
  const record = asRecord(value);
  if (!record) {
    return { ok: false, reason: "recipient details are required" };
  }
  const firstName = parseName(record.firstName, "recipient first name");
  if (!firstName.ok) {
    return firstName;
  }
  const lastName = parseName(record.lastName, "recipient last name");
  if (!lastName.ok) {
    return lastName;
  }
  return {
    ok: true,
    details: { firstName: firstName.value, lastName: lastName.value },
  };
}

function parseSenderDetails(
  value: unknown,
):
  | { ok: true; details: RemittanceSenderDetails }
  | { ok: false; reason: string } {
  const record = asRecord(value);
  if (!record) {
    return { ok: false, reason: "sender details are required" };
  }

  const firstName = parseName(record.firstName, "sender first name");
  if (!firstName.ok) {
    return firstName;
  }
  const lastName = parseName(record.lastName, "sender last name");
  if (!lastName.ok) {
    return lastName;
  }
  const nationality = normalizeCorridorCountry(record.nationality);
  if (!nationality.ok) {
    return {
      ok: false,
      reason: "sender nationality must be a 3-letter ISO code",
    };
  }
  const phoneNumber = parseSenderPhone(record.phoneNumber);
  if (!phoneNumber.ok) {
    return phoneNumber;
  }

  const addressRecord = asRecord(record.address);
  if (!addressRecord) {
    return { ok: false, reason: "sender address is required" };
  }
  const addressLine = parseBoundedString(
    addressRecord.addressLine,
    "sender address line",
    128,
  );
  if (!addressLine.ok) {
    return addressLine;
  }
  const postalCode = parseBoundedString(
    addressRecord.postalCode,
    "sender postal code",
    32,
  );
  if (!postalCode.ok) {
    return postalCode;
  }
  const city = parseBoundedString(addressRecord.city, "sender city", 64);
  if (!city.ok) {
    return city;
  }
  const addressCountry = normalizeCorridorCountry(addressRecord.country);
  if (!addressCountry.ok) {
    return {
      ok: false,
      reason: "sender address country must be a 3-letter ISO code",
    };
  }

  const identificationRecord = asRecord(record.identification);
  if (!identificationRecord) {
    return { ok: false, reason: "sender identification is required" };
  }
  const identificationType = parseAllowlist(
    identificationRecord.type,
    IDENTIFICATION_TYPES,
    "identification type",
  );
  if (!identificationType.ok) {
    return identificationType;
  }
  const identificationNumber = parseBoundedString(
    identificationRecord.number,
    "identification number",
    64,
  );
  if (!identificationNumber.ok) {
    return identificationNumber;
  }

  return {
    ok: true,
    details: {
      firstName: firstName.value,
      lastName: lastName.value,
      nationality: nationality.country,
      phoneNumber: phoneNumber.value,
      address: {
        addressLine: addressLine.value,
        postalCode: postalCode.value,
        city: city.value,
        country: addressCountry.country,
      },
      identification: {
        type: identificationType.value,
        number: identificationNumber.value,
      },
    },
  };
}

function parseTransactionDetails(
  value: unknown,
  remittanceId: string,
):
  | { ok: true; details: RemittanceTransactionDetails }
  | { ok: false; reason: string } {
  const record = asRecord(value) ?? {};

  const originalAmount = parseAmountString(
    record.originalAmount,
    "original amount",
  );
  if (!originalAmount.ok) {
    return originalAmount;
  }
  const originalCurrency = normalizeCorridorCurrency(record.originalCurrency);
  if (!originalCurrency.ok) {
    return {
      ok: false,
      reason: "original currency must be a 3-letter ISO code",
    };
  }
  const buyFxRate = parseAmountString(record.buyFxRate, "buy fx rate", true);
  if (!buyFxRate.ok) {
    return buyFxRate;
  }
  const senderFees = parseAmountString(record.senderFees, "sender fees", true);
  if (!senderFees.ok) {
    return senderFees;
  }

  const purpose =
    record.purposeOfFunds === undefined ||
    record.purposeOfFunds === null ||
    record.purposeOfFunds === ""
      ? ({ ok: true, value: "PERSONAL_TRANSFER" as const } as const)
      : parseAllowlist(
          record.purposeOfFunds,
          PURPOSE_OF_FUNDS,
          "purpose of funds",
        );
  if (!purpose.ok) {
    return purpose;
  }

  const source =
    record.sourceOfFunds === undefined ||
    record.sourceOfFunds === null ||
    record.sourceOfFunds === ""
      ? ({ ok: true, value: "OTHER" as const } as const)
      : parseAllowlist(
          record.sourceOfFunds,
          SOURCE_OF_FUNDS,
          "source of funds",
        );
  if (!source.ok) {
    return source;
  }

  return {
    ok: true,
    details: {
      transactionReference: remittanceId,
      originalAmount: originalAmount.value,
      originalCurrency: originalCurrency.currency,
      buyFxRate: buyFxRate.value,
      senderFees: senderFees.value,
      purposeOfFunds: purpose.value,
      sourceOfFunds: source.value,
    },
  };
}

function parseName(
  value: unknown,
  field: string,
): { ok: true; value: string } | { ok: false; reason: string } {
  return parseBoundedString(value, field, 64);
}

function parseBoundedString(
  value: unknown,
  field: string,
  max: number,
): { ok: true; value: string } | { ok: false; reason: string } {
  if (typeof value !== "string") {
    return { ok: false, reason: `${field} is required` };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, reason: `${field} is required` };
  }
  if (trimmed.length > max) {
    return { ok: false, reason: `${field} must be ${max} characters or fewer` };
  }
  return { ok: true, value: trimmed };
}

function parseSenderPhone(
  value: unknown,
): { ok: true; value: string } | { ok: false; reason: string } {
  if (typeof value !== "string") {
    return { ok: false, reason: "sender phone number is required" };
  }
  const digits = stripPhoneDigits(value);
  if (!/^[0-9]{10,15}$/.test(digits)) {
    return {
      ok: false,
      reason: "sender phone number must be 10 to 15 digits",
    };
  }
  return { ok: true, value: digits };
}

function parseAmountString(
  value: unknown,
  field: string,
  allowZero = false,
): { ok: true; value: string } | { ok: false; reason: string } {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0 || (!allowZero && value <= 0)) {
      return {
        ok: false,
        reason: allowZero
          ? `${field} must be zero or greater`
          : `${field} must be greater than 0`,
      };
    }
    return { ok: true, value: String(value) };
  }
  if (typeof value !== "string") {
    return { ok: false, reason: `${field} is required` };
  }
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return { ok: false, reason: `${field} is invalid` };
  }
  const numeric = Number(trimmed);
  if (
    !Number.isFinite(numeric) ||
    numeric < 0 ||
    (!allowZero && numeric <= 0)
  ) {
    return {
      ok: false,
      reason: allowZero
        ? `${field} must be zero or greater`
        : `${field} must be greater than 0`,
    };
  }
  return { ok: true, value: trimmed };
}

function parseAllowlist<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): { ok: true; value: T } | { ok: false; reason: string } {
  if (typeof value !== "string") {
    return { ok: false, reason: `${field} is required` };
  }
  const normalized = value.trim().toUpperCase();
  const match = allowed.find((item) => item === normalized);
  if (!match) {
    return { ok: false, reason: `${field} is invalid` };
  }
  return { ok: true, value: match };
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

async function loadRemittanceCorridor(
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

  const conf = await getActiveConf(configured.config);
  if (!conf.ok) {
    return { ok: false, reason: conf.reason, status: 503 };
  }

  const countries = listRemittanceCountries(conf.data);
  const selected = countries.find((row) => row.country === country);
  if (!selected) {
    return {
      ok: false,
      reason: "no remittance corridor for this country",
      status: 400,
    };
  }

  const providers = listRemittanceProviders(conf.data, country);
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

  const payout = pickRemittanceCorridor(conf.data, { country, provider });
  if (!payout || payout.currency !== currency) {
    return {
      ok: false,
      reason: "remittance corridor is not configured",
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
