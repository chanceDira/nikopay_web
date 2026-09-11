"use client";

import { useEffect, useState } from "react";
import {
  fetchCorridorCountries,
  fetchCorridorProviders,
  type CorridorCountryOption,
  type CorridorProviderOption,
} from "@/lib/pay-api";
import { formatLocalAmount } from "@/lib/rates";

type BulkItemView = {
  payoutId: string;
  msisdn: string;
  amount: number;
  status: string;
  providerReason: string | null;
};

type BulkBatchView = {
  id: string;
  label: string | null;
  country: string;
  currency: string;
  provider: string;
  itemCount: number;
  totalAmount: number;
  createdAt: string;
  items: BulkItemView[];
};

type DraftRow = { msisdn: string; amount: string };

const HEADERS = { "Content-Type": "application/json" };
const FALLBACK_COUNTRY = "RWA";
const MAX_ITEMS = 20;
const FIELD_CLASS =
  "mt-1 w-full rounded-md border border-niko-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-niko-teal/50";

function emptyRow(): DraftRow {
  return { msisdn: "", amount: "" };
}

export function AdminBulkPayouts() {
  const [batches, setBatches] = useState<BulkBatchView[]>([]);
  const [label, setLabel] = useState("");
  const [countries, setCountries] = useState<CorridorCountryOption[]>([]);
  const [providers, setProviders] = useState<CorridorProviderOption[]>([]);
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [provider, setProvider] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([emptyRow(), emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [retryingId, setRetryingId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [corridorLoading, setCorridorLoading] = useState(true);

  const loadBatches = async () => {
    const res = await fetch("/api/admin/bulk");
    const json = (await res.json()) as {
      data?: { batches: BulkBatchView[] };
      error?: string;
    };
    if (!res.ok) {
      setErrorMsg(json.error ?? "unable to load bulk payouts");
      return;
    }
    setBatches(json.data?.batches ?? []);
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
    const result = await fetchCorridorProviders(nextCountry);
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
      void loadBatches();
      const countriesResult = await fetchCorridorCountries();
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

  const updateRow = (index: number, patch: Partial<DraftRow>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSaving(true);
    const items = rows
      .filter((row) => row.msisdn.trim() && row.amount.trim())
      .map((row) => ({
        msisdn: row.msisdn,
        amount: Number(row.amount),
      }));
    const res = await fetch("/api/admin/bulk", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        label: label.trim() || null,
        country,
        currency,
        provider,
        items,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setErrorMsg(json.error ?? "unable to submit bulk payout");
      await loadBatches();
      return;
    }
    setLabel("");
    setRows([emptyRow(), emptyRow()]);
    await loadBatches();
  };

  const handleRetry = async (id: string) => {
    setErrorMsg("");
    setRetryingId(id);
    const res = await fetch(`/api/admin/bulk/${id}/retry`, { method: "POST" });
    const json = (await res.json()) as { error?: string };
    setRetryingId("");
    if (!res.ok) {
      setErrorMsg(json.error ?? "unable to retry");
    }
    await loadBatches();
  };

  const busy = saving || corridorLoading;

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
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
          Country
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

        <div className="sm:col-span-2 space-y-3">
          <p className="text-sm">Recipients (1–{MAX_ITEMS})</p>
          {rows.map((row, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-2">
              <input
                value={row.msisdn}
                onChange={(e) => updateRow(index, { msisdn: e.target.value })}
                inputMode="tel"
                placeholder="07… or +country code"
                className={FIELD_CLASS}
              />
              <input
                value={row.amount}
                onChange={(e) => updateRow(index, { amount: e.target.value })}
                inputMode="decimal"
                placeholder={currency ? `amount (${currency})` : "amount"}
                className={FIELD_CLASS}
              />
            </div>
          ))}
          <button
            type="button"
            disabled={rows.length >= MAX_ITEMS}
            onClick={() => setRows((current) => [...current, emptyRow()])}
            className="text-xs text-niko-teal hover:underline disabled:opacity-50"
          >
            Add recipient
          </button>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy || !country || !provider}
            className="rounded-md border border-niko-teal/40 bg-niko-teal/10 px-4 py-2 text-sm text-niko-teal hover:border-niko-teal disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Submit bulk"}
          </button>
        </div>
      </form>

      {errorMsg ? <p className="text-sm text-red-400">{errorMsg}</p> : null}

      <div className="space-y-4">
        {batches.length === 0 ? (
          <p className="text-sm text-niko-muted">No bulk payouts yet</p>
        ) : (
          batches.map((batch) => {
            const pending = batch.items.some((row) => row.status === "pending");
            return (
              <div
                key={batch.id}
                className="rounded-md border border-niko-border/40 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-niko-muted">
                      {batch.country} · {batch.currency} · {batch.provider}
                    </p>
                    <p className="text-sm mt-1">
                      {batch.label ?? "Untitled batch"} · {batch.itemCount}{" "}
                      items ·{" "}
                      {formatLocalAmount(batch.totalAmount, batch.currency)}
                    </p>
                  </div>
                  {pending ? (
                    <button
                      type="button"
                      disabled={retryingId === batch.id}
                      onClick={() => void handleRetry(batch.id)}
                      className="text-xs text-niko-teal hover:underline disabled:opacity-50"
                    >
                      {retryingId === batch.id
                        ? "Retrying..."
                        : "Retry pending"}
                    </button>
                  ) : null}
                </div>
                <table className="w-full text-left text-xs">
                  <tbody>
                    {batch.items.map((item) => (
                      <tr
                        key={item.payoutId}
                        className="border-t border-niko-border/30"
                      >
                        <td className="py-2 pr-3 font-mono">{item.msisdn}</td>
                        <td className="py-2 pr-3 font-mono">
                          {formatLocalAmount(item.amount, batch.currency)}
                        </td>
                        <td className="py-2 font-mono text-niko-muted">
                          {item.status}
                          {item.providerReason
                            ? ` · ${item.providerReason}`
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
