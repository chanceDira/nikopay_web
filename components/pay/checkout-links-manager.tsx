"use client";

import { useEffect, useState } from "react";
import {
  fetchCorridorCountries,
  fetchCorridorProviders,
  type CorridorCountryOption,
  type CorridorProviderOption,
} from "@/lib/pay-api";
import { formatUsdt } from "@/lib/rates";
import { paginate } from "@/lib/paginate";
import {
  PaginationControls,
  TABLE_PAGE_SIZE,
} from "@/components/shared/pagination-controls";

export type CheckoutRow = {
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

type FormState = "idle" | "saving" | "error";

const HEADERS = { "Content-Type": "application/json" };
const FALLBACK_COUNTRY = "RWA";
const FIELD_CLASS =
  "niko-field mt-1 w-full rounded-md px-3 py-2 font-mono text-sm outline-none";

type CheckoutLinksManagerProps = {
  mode: "admin" | "user";
  walletAddress?: string | null;
};

export function CheckoutLinksManager({
  mode,
  walletAddress,
}: CheckoutLinksManagerProps) {
  const [rows, setRows] = useState<CheckoutRow[]>([]);
  const [label, setLabel] = useState("");
  const [usdtAmount, setUsdtAmount] = useState("0.1");
  const [countries, setCountries] = useState<CorridorCountryOption[]>([]);
  const [providers, setProviders] = useState<CorridorProviderOption[]>([]);
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [provider, setProvider] = useState("");
  const [msisdn, setMsisdn] = useState("");
  const [expiresHours, setExpiresHours] = useState("72");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [corridorLoading, setCorridorLoading] = useState(true);
  const [page, setPage] = useState(1);

  const selectedCountry =
    countries.find((row) => row.country === country) ?? null;
  const dialPrefix = selectedCountry?.prefix ?? "";
  const paged = paginate(rows, page, TABLE_PAGE_SIZE);

  const loadLinks = async () => {
    const url =
      mode === "admin"
        ? "/api/admin/checkouts"
        : `/api/checkouts?wallet=${encodeURIComponent(walletAddress ?? "")}`;
    if (mode === "user" && !walletAddress) {
      setRows([]);
      return;
    }
    const res = await fetch(url);
    if (!res.ok) {
      return;
    }
    const json = (await res.json()) as { data: { checkouts: CheckoutRow[] } };
    setRows(json.data.checkouts ?? []);
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

    const boot = async () => {
      if (mode === "user" && !walletAddress) {
        setRows([]);
        setCorridorLoading(false);
        return;
      }

      await loadLinks();
      if (cancelled) {
        return;
      }

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
      const initial =
        list.find((row) => row.country === FALLBACK_COUNTRY) ?? list[0] ?? null;
      if (!initial) {
        setCorridorLoading(false);
        return;
      }
      setCountry(initial.country);
      const reason = await loadProviders(initial.country);
      if (cancelled) {
        return;
      }
      if (reason) {
        setErrorMsg(reason);
      }
      setCorridorLoading(false);
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [mode, walletAddress]);

  const handleCountryChange = async (nextCountry: string) => {
    setCountry(nextCountry);
    setErrorMsg("");
    const reason = await loadProviders(nextCountry);
    if (reason) {
      setErrorMsg(reason);
    }
  };

  const handleProviderChange = (nextProvider: string) => {
    setProvider(nextProvider);
    const match = providers.find((row) => row.provider === nextProvider);
    setCurrency(match?.currency ?? "");
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg("");
    if (mode === "user" && !walletAddress) {
      setErrorMsg("Connect a wallet to create a pay link.");
      return;
    }
    setFormState("saving");
    const body: Record<string, unknown> = {
      label: label.trim() || null,
      usdtAmount: Number(usdtAmount),
      country,
      currency,
      provider,
      msisdn,
      expiresHours: Number(expiresHours),
    };
    if (mode === "user") {
      body.walletAddress = walletAddress;
    }
    const res = await fetch(
      mode === "admin" ? "/api/admin/checkouts" : "/api/checkouts",
      {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(body),
      },
    );
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFormState("error");
      setErrorMsg(json.error ?? "Unable to create link.");
      return;
    }
    setFormState("idle");
    setLabel("");
    setMsisdn("");
    setPage(1);
    await loadLinks();
  };

  const handleRevoke = async (id: string) => {
    setErrorMsg("");
    const res = await fetch(
      mode === "admin"
        ? `/api/admin/checkouts/${id}/revoke`
        : `/api/checkouts/mine/${id}/revoke`,
      {
        method: "POST",
        headers: HEADERS,
        body:
          mode === "user"
            ? JSON.stringify({ walletAddress })
            : JSON.stringify({}),
      },
    );
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setErrorMsg(json.error ?? "Unable to revoke link.");
      return;
    }
    await loadLinks();
  };

  const handleCopy = async (row: CheckoutRow) => {
    await navigator.clipboard.writeText(row.url);
    setCopiedId(row.id);
    window.setTimeout(() => setCopiedId(""), 2000);
  };

  const busy = formState === "saving" || corridorLoading;
  const numberPlaceholder = dialPrefix
    ? `07… or +${dialPrefix} …`
    : "local or +country code";
  const intentHref = (intentId: string) =>
    mode === "admin"
      ? `/admin/transactions/${intentId}`
      : `/app/payments/${intentId}`;

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => void handleCreate(e)}
        className="niko-panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
      >
        <div className="sm:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">
            Create payout link
          </h2>
          <p className="mt-1 text-xs text-niko-muted">
            Share a one-time link. The payer sends USDT; the recipient gets
            mobile money for the amount and corridor you lock in.
          </p>
        </div>
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
          USDT amount
          <input
            value={usdtAmount}
            onChange={(e) => setUsdtAmount(e.target.value)}
            inputMode="decimal"
            required
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
        <label className="text-sm">
          Recipient number
          <input
            value={msisdn}
            onChange={(e) => setMsisdn(e.target.value)}
            required
            inputMode="tel"
            placeholder={numberPlaceholder}
            className={FIELD_CLASS}
          />
          <span className="mt-1 block text-[11px] text-niko-muted">
            Local or international. Country code is added from the selected
            corridor.
          </span>
        </label>
        <label className="text-sm">
          Expires in hours (0 = no expiry)
          <input
            value={expiresHours}
            onChange={(e) => setExpiresHours(e.target.value)}
            inputMode="numeric"
            className={FIELD_CLASS}
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={
              busy ||
              !country ||
              !provider ||
              (mode === "user" && !walletAddress)
            }
            className="w-full rounded-md bg-niko-teal px-4 py-2.5 text-sm font-semibold text-niko-on-accent transition-colors hover:bg-niko-teal-bright disabled:opacity-50 sm:w-auto"
          >
            {formState === "saving" ? "Creating..." : "Create payout link"}
          </button>
        </div>
      </form>

      {errorMsg ? <p className="text-sm text-red-400">{errorMsg}</p> : null}

      <div className="niko-panel overflow-hidden">
        <div className="border-b border-niko-border/40 bg-niko-well/40 px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-foreground">Your links</h2>
          <p className="mt-1 text-xs text-niko-muted">
            Active links stand out below. Copy and send the payout URL.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-niko-border/40 bg-niko-well/30 text-xs text-niko-muted">
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium">USDT</th>
                <th className="px-5 py-3.5 font-medium">Corridor</th>
                <th className="px-5 py-3.5 font-medium">Recipient</th>
                <th className="min-w-[16rem] px-5 py-3.5 font-medium">
                  Payout link
                </th>
                <th className="px-5 py-3.5 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-niko-border/20">
              {paged.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-niko-muted"
                  >
                    No pay links yet
                  </td>
                </tr>
              ) : (
                paged.items.map((row) => {
                  const active = row.status === "active";
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors hover:bg-niko-well/40 ${
                        active ? "bg-niko-teal/[0.04]" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] capitalize ${
                            active
                              ? "border-niko-teal/35 bg-niko-teal/15 text-niko-teal"
                              : "border-niko-border text-niko-muted"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-semibold">
                        {formatUsdt(row.usdtAmount)}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs">
                        {row.country} · {row.currency} · {row.provider}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs">
                        {row.msisdn}
                        {row.label ? (
                          <span className="mt-1 block text-[11px] text-niko-muted">
                            {row.label}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <div
                          className={`flex flex-col gap-2 rounded-md border p-2.5 sm:flex-row sm:items-center sm:justify-between ${
                            active
                              ? "border-niko-teal/40 bg-niko-teal/10"
                              : "border-niko-border/50 bg-niko-well/40"
                          }`}
                        >
                          <code
                            className={`break-all font-mono text-[11px] sm:text-xs ${
                              active ? "text-niko-teal" : "text-niko-muted"
                            }`}
                          >
                            {row.url}
                          </code>
                          <button
                            type="button"
                            onClick={() => void handleCopy(row)}
                            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                              active
                                ? "bg-niko-teal text-niko-on-accent hover:bg-niko-teal-bright"
                                : "border border-niko-border text-niko-muted hover:text-foreground"
                            }`}
                          >
                            {copiedId === row.id ? "Copied" : "Copy link"}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {active ? (
                          <button
                            type="button"
                            onClick={() => void handleRevoke(row.id)}
                            className="text-xs text-niko-muted hover:text-red-400"
                          >
                            Revoke
                          </button>
                        ) : row.intentId ? (
                          <a
                            href={intentHref(row.intentId)}
                            className="text-xs text-niko-teal hover:underline"
                          >
                            Intent
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-niko-border/40 px-5 py-4 sm:px-6">
          <PaginationControls
            page={paged.page}
            totalPages={paged.totalPages}
            total={paged.total}
            label="links"
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => current + 1)}
          />
        </div>
      </div>
    </div>
  );
}
