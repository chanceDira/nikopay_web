"use client";

import { useEffect, useState } from "react";
import {
  fetchRemittanceCorridorCountries,
  fetchRemittanceCorridorProviders,
  type CorridorCountryOption,
  type CorridorProviderOption,
} from "@/lib/pay-api";
import { formatLocalAmount } from "@/lib/rates";

type RemittanceView = {
  id: string;
  remittanceId: string;
  label: string | null;
  amount: number;
  currency: string;
  recipientCountry: string;
  recipientProvider: string;
  recipientMsisdn: string;
  status: string;
  providerReason: string | null;
  createdAt: string;
};

const HEADERS = { "Content-Type": "application/json" };
const FALLBACK_COUNTRY = "RWA";
const FIELD_CLASS =
  "mt-1 w-full rounded-md border border-niko-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-niko-teal/50";

const PURPOSE_OPTIONS = [
  "PERSONAL_TRANSFER",
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
  "OTHER",
] as const;

const SOURCE_OPTIONS = [
  "OTHER",
  "SALARY",
  "SAVINGS",
  "LOTTERY",
  "LOAN",
  "BUSINESS_INCOME",
  "GIFT",
] as const;

const ID_TYPE_OPTIONS = [
  "PASSPORT",
  "NATIONAL_ID",
  "DRIVING_LICENSE",
  "SOCIAL_SECURITY_ID",
  "RESIDENCE_PERMIT",
] as const;

export function AdminRemittances() {
  const [rows, setRows] = useState<RemittanceView[]>([]);
  const [label, setLabel] = useState("");
  const [countries, setCountries] = useState<CorridorCountryOption[]>([]);
  const [providers, setProviders] = useState<CorridorProviderOption[]>([]);
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [provider, setProvider] = useState("");
  const [msisdn, setMsisdn] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [senderFirstName, setSenderFirstName] = useState("");
  const [senderLastName, setSenderLastName] = useState("");
  const [senderNationality, setSenderNationality] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [idType, setIdType] =
    useState<(typeof ID_TYPE_OPTIONS)[number]>("PASSPORT");
  const [idNumber, setIdNumber] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [originalCurrency, setOriginalCurrency] = useState("USD");
  const [buyFxRate, setBuyFxRate] = useState("");
  const [senderFees, setSenderFees] = useState("0");
  const [purpose, setPurpose] =
    useState<(typeof PURPOSE_OPTIONS)[number]>("PERSONAL_TRANSFER");
  const [source, setSource] =
    useState<(typeof SOURCE_OPTIONS)[number]>("OTHER");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [corridorLoading, setCorridorLoading] = useState(true);

  const selectedCountry =
    countries.find((row) => row.country === country) ?? null;
  const dialPrefix = selectedCountry?.prefix ?? "";

  const loadRows = async () => {
    const res = await fetch("/api/admin/remittances");
    const json = (await res.json()) as {
      data?: { remittances: RemittanceView[] };
      error?: string;
    };
    if (!res.ok) {
      setErrorMsg(json.error ?? "unable to load remittances");
      return;
    }
    setRows(json.data?.remittances ?? []);
  };

  const applyProviders = (
    list: CorridorProviderOption[],
    preferred?: string,
  ) => {
    setProviders(list);
    const next =
      list.find((row) => row.provider === preferred) ?? list[0] ?? null;
    setProvider(next?.provider ?? "");
    setCurrency(next?.currency ?? "");
  };

  const loadProviders = async (nextCountry: string, preferred?: string) => {
    const result = await fetchRemittanceCorridorProviders(nextCountry);
    if (!result.ok) {
      applyProviders([]);
      return result.reason;
    }
    applyProviders(result.data.providers, preferred);
    return null;
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      void loadRows();
      const countriesResult = await fetchRemittanceCorridorCountries();
      if (cancelled) {
        return;
      }
      if (!countriesResult.ok) {
        setCorridorLoading(false);
        setErrorMsg(countriesResult.reason);
        return;
      }
      const list = countriesResult.data.countries;
      setCountries(list);
      const preferred =
        list.find((row) => row.country === FALLBACK_COUNTRY) ?? list[0];
      if (!preferred) {
        setCorridorLoading(false);
        setErrorMsg("no payout countries configured");
        return;
      }
      setCountry(preferred.country);
      const providerError = await loadProviders(preferred.country);
      if (cancelled) {
        return;
      }
      setCorridorLoading(false);
      if (providerError) {
        setErrorMsg(providerError);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load corridors once on mount
  }, []);

  const handleCountryChange = async (next: string) => {
    setCountry(next);
    setErrorMsg("");
    setCorridorLoading(true);
    const providerError = await loadProviders(next);
    setCorridorLoading(false);
    if (providerError) {
      setErrorMsg(providerError);
    }
  };

  const handleProviderChange = (next: string) => {
    const selected = providers.find((row) => row.provider === next);
    setProvider(next);
    if (selected) {
      setCurrency(selected.currency);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSaving(true);
    const res = await fetch("/api/admin/remittances", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        label: label.trim() || null,
        country,
        currency,
        provider,
        msisdn,
        amount: Number(amount),
        recipient: {
          firstName: recipientFirstName,
          lastName: recipientLastName,
        },
        sender: {
          firstName: senderFirstName,
          lastName: senderLastName,
          nationality: senderNationality,
          phoneNumber: senderPhone,
          address: {
            addressLine,
            postalCode,
            city,
            country: addressCountry,
          },
          identification: {
            type: idType,
            number: idNumber,
          },
        },
        transaction: {
          originalAmount,
          originalCurrency,
          buyFxRate,
          senderFees,
          purposeOfFunds: purpose,
          sourceOfFunds: source,
        },
      }),
    });
    const json = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setErrorMsg(json.error ?? "unable to start remittance");
      await loadRows();
      return;
    }
    setLabel("");
    setMsisdn("");
    setAmount("");
    setRecipientFirstName("");
    setRecipientLastName("");
    setIdNumber("");
    await loadRows();
  };

  const busy = saving || corridorLoading;

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleCreate}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="text-sm">
          Label (optional)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          Recipient country
          <select
            value={country}
            onChange={(e) => void handleCountryChange(e.target.value)}
            required
            disabled={corridorLoading || countries.length === 0}
            className={`${FIELD_CLASS} cursor-pointer disabled:opacity-50`}
          >
            {countries.length === 0 ? (
              <option value="">No countries available</option>
            ) : (
              countries.map((row) => (
                <option key={row.country} value={row.country}>
                  {row.displayName} (+{row.prefix})
                </option>
              ))
            )}
          </select>
        </label>
        <label className="text-sm">
          Currency
          <input
            value={currency}
            readOnly
            className={`${FIELD_CLASS} text-niko-muted`}
          />
        </label>
        <label className="text-sm">
          Provider
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            required
            disabled={corridorLoading || providers.length === 0}
            className={`${FIELD_CLASS} cursor-pointer disabled:opacity-50`}
          >
            {providers.length === 0 ? (
              <option value="">No providers available</option>
            ) : (
              providers.map((row) => (
                <option
                  key={`${row.provider}-${row.currency}`}
                  value={row.provider}
                >
                  {row.displayName} ({row.provider})
                </option>
              ))
            )}
          </select>
        </label>
        <label className="text-sm">
          Recipient number
          <input
            value={msisdn}
            onChange={(e) => setMsisdn(e.target.value)}
            inputMode="tel"
            required
            placeholder={
              dialPrefix ? `07… or +${dialPrefix}` : "07… or +country code"
            }
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          Amount
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            required
            placeholder={currency ? `amount (${currency})` : "amount"}
            className={FIELD_CLASS}
          />
        </label>

        <label className="text-sm">
          Recipient first name
          <input
            value={recipientFirstName}
            onChange={(e) => setRecipientFirstName(e.target.value)}
            required
            maxLength={64}
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          Recipient last name
          <input
            value={recipientLastName}
            onChange={(e) => setRecipientLastName(e.target.value)}
            required
            maxLength={64}
            className={FIELD_CLASS}
          />
        </label>

        <label className="text-sm">
          Sender first name
          <input
            value={senderFirstName}
            onChange={(e) => setSenderFirstName(e.target.value)}
            required
            maxLength={64}
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          Sender last name
          <input
            value={senderLastName}
            onChange={(e) => setSenderLastName(e.target.value)}
            required
            maxLength={64}
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          Sender nationality
          <input
            value={senderNationality}
            onChange={(e) => setSenderNationality(e.target.value.toUpperCase())}
            required
            maxLength={3}
            placeholder="USA"
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          Sender phone
          <input
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
            inputMode="tel"
            required
            placeholder="digits only"
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm sm:col-span-2 lg:col-span-3">
          Address line
          <input
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            required
            maxLength={128}
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          Postal code
          <input
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
            maxLength={32}
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          City
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            maxLength={64}
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          Address country
          <input
            value={addressCountry}
            onChange={(e) => setAddressCountry(e.target.value.toUpperCase())}
            required
            maxLength={3}
            placeholder="USA"
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          ID type
          <select
            value={idType}
            onChange={(e) =>
              setIdType(e.target.value as (typeof ID_TYPE_OPTIONS)[number])
            }
            required
            className={`${FIELD_CLASS} cursor-pointer`}
          >
            {ID_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          ID number
          <input
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            required
            maxLength={64}
            className={FIELD_CLASS}
          />
        </label>

        <label className="text-sm">
          Original amount
          <input
            value={originalAmount}
            onChange={(e) => setOriginalAmount(e.target.value)}
            inputMode="decimal"
            required
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          Original currency
          <input
            value={originalCurrency}
            onChange={(e) => setOriginalCurrency(e.target.value.toUpperCase())}
            required
            maxLength={3}
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          Buy fx rate
          <input
            value={buyFxRate}
            onChange={(e) => setBuyFxRate(e.target.value)}
            inputMode="decimal"
            required
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          Sender fees
          <input
            value={senderFees}
            onChange={(e) => setSenderFees(e.target.value)}
            inputMode="decimal"
            required
            className={FIELD_CLASS}
          />
        </label>
        <label className="text-sm">
          Purpose of funds
          <select
            value={purpose}
            onChange={(e) =>
              setPurpose(e.target.value as (typeof PURPOSE_OPTIONS)[number])
            }
            className={`${FIELD_CLASS} cursor-pointer`}
          >
            {PURPOSE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Source of funds
          <select
            value={source}
            onChange={(e) =>
              setSource(e.target.value as (typeof SOURCE_OPTIONS)[number])
            }
            className={`${FIELD_CLASS} cursor-pointer`}
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={busy || !country || !provider}
            className="rounded-md border border-niko-teal/40 bg-niko-teal/10 px-4 py-2 text-sm text-niko-teal hover:border-niko-teal disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Start remittance"}
          </button>
        </div>
      </form>

      {errorMsg ? <p className="text-sm text-red-400">{errorMsg}</p> : null}

      <div className="rounded-md border border-niko-border/40 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-niko-border/30 bg-niko-surface/20 text-xs font-mono uppercase tracking-wider text-niko-muted">
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Corridor</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-niko-border/10">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-niko-muted"
                >
                  No remittances yet
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-xs">
                    {new Date(row.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.recipientCountry} · {row.recipientProvider}
                    {row.label ? (
                      <span className="block text-niko-muted">{row.label}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.recipientMsisdn}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-right">
                    {formatLocalAmount(row.amount, row.currency)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-niko-muted">
                    {row.status}
                    {row.providerReason ? ` · ${row.providerReason}` : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
