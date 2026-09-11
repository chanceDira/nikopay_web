"use client";

import { useEffect, useState } from "react";
import { formatUsdt } from "@/lib/rates";

type CheckoutRow = {
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

export function AdminCheckoutLinks() {
  const [rows, setRows] = useState<CheckoutRow[]>([]);
  const [label, setLabel] = useState("");
  const [usdtAmount, setUsdtAmount] = useState("0.1");
  const [country, setCountry] = useState("RWA");
  const [currency, setCurrency] = useState("RWF");
  const [provider, setProvider] = useState("MTN_MOMO_RWA");
  const [msisdn, setMsisdn] = useState("");
  const [expiresHours, setExpiresHours] = useState("72");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/checkouts");
    if (!res.ok) {
      return;
    }
    const json = (await res.json()) as { data: { checkouts: CheckoutRow[] } };
    setRows(json.data.checkouts ?? []);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setFormState("saving");
    const hours = Number(expiresHours);
    const res = await fetch("/api/admin/checkouts", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        label: label.trim() || null,
        usdtAmount: Number(usdtAmount),
        country,
        currency,
        provider,
        msisdn,
        expiresHours: Number.isInteger(hours) ? hours : 72,
      }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFormState("error");
      setErrorMsg(json.error ?? "unable to create link");
      return;
    }
    setFormState("idle");
    setLabel("");
    await load();
  };

  const handleRevoke = async (id: string) => {
    setErrorMsg("");
    const res = await fetch(`/api/admin/checkouts/${id}/revoke`, {
      method: "POST",
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setErrorMsg(json.error ?? "unable to revoke");
      return;
    }
    await load();
  };

  const handleCopy = async (row: CheckoutRow) => {
    const href = `${window.location.origin}${row.path}`;
    await navigator.clipboard.writeText(href);
    setCopiedId(row.id);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Label (optional)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            className="mt-1 w-full rounded-md border border-niko-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-niko-teal/50"
          />
        </label>
        <label className="text-sm">
          USDT amount
          <input
            value={usdtAmount}
            onChange={(e) => setUsdtAmount(e.target.value)}
            inputMode="decimal"
            required
            className="mt-1 w-full rounded-md border border-niko-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-niko-teal/50"
          />
        </label>
        <label className="text-sm">
          Country
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            required
            className="mt-1 w-full rounded-md border border-niko-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-niko-teal/50"
          />
        </label>
        <label className="text-sm">
          Currency
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            required
            className="mt-1 w-full rounded-md border border-niko-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-niko-teal/50"
          />
        </label>
        <label className="text-sm">
          Provider
          <input
            value={provider}
            onChange={(e) => setProvider(e.target.value.toUpperCase())}
            required
            className="mt-1 w-full rounded-md border border-niko-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-niko-teal/50"
          />
        </label>
        <label className="text-sm">
          Recipient MSISDN
          <input
            value={msisdn}
            onChange={(e) => setMsisdn(e.target.value)}
            required
            inputMode="tel"
            className="mt-1 w-full rounded-md border border-niko-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-niko-teal/50"
          />
        </label>
        <label className="text-sm">
          Expires in hours (0 = no expiry)
          <input
            value={expiresHours}
            onChange={(e) => setExpiresHours(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-md border border-niko-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-niko-teal/50"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={formState === "saving"}
            className="rounded-md border border-niko-teal/40 bg-niko-teal/10 px-4 py-2 text-sm text-niko-teal hover:border-niko-teal disabled:opacity-50"
          >
            {formState === "saving" ? "Creating..." : "Create link"}
          </button>
        </div>
      </form>

      {errorMsg ? <p className="text-sm text-red-400">{errorMsg}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-niko-border text-niko-muted">
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">USDT</th>
              <th className="py-2 pr-3 font-medium">Corridor</th>
              <th className="py-2 pr-3 font-medium">Recipient</th>
              <th className="py-2 pr-3 font-medium">Link</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-niko-muted">
                  No pay links yet
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-niko-border/40">
                  <td className="py-3 pr-3 font-mono text-xs">{row.status}</td>
                  <td className="py-3 pr-3 font-mono">
                    {formatUsdt(row.usdtAmount)}
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs">
                    {row.country} · {row.currency} · {row.provider}
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs">{row.msisdn}</td>
                  <td className="py-3 pr-3">
                    <button
                      type="button"
                      onClick={() => void handleCopy(row)}
                      className="text-xs text-niko-teal hover:underline"
                    >
                      {copiedId === row.id ? "Copied" : "Copy"}
                    </button>
                    {row.label ? (
                      <p className="mt-1 text-[11px] text-niko-muted">
                        {row.label}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-3 text-right">
                    {row.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => void handleRevoke(row.id)}
                        className="text-xs text-niko-muted hover:text-red-400"
                      >
                        Revoke
                      </button>
                    ) : row.intentId ? (
                      <a
                        href={`/admin/transactions/${row.intentId}`}
                        className="text-xs text-niko-teal hover:underline"
                      >
                        Intent
                      </a>
                    ) : null}
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
