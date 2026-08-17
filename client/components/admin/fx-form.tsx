"use client";

import { useEffect, useState } from "react";

type RateLog = {
  rate: number;
  fee: number;
  minUsdt: number;
  operator: string;
  timestamp: string;
};

const SEED_HISTORY: RateLog[] = [
  {
    rate: 1350,
    fee: 1.5,
    minUsdt: 10,
    operator: "Super Admin",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    rate: 1345,
    fee: 1.5,
    minUsdt: 10,
    operator: "Finance Lead",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    rate: 1338,
    fee: 2.0,
    minUsdt: 5,
    operator: "Ops Manager",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function AdminFxForm() {
  const [rate, setRate] = useState<number>(1350);
  const [fee, setFee] = useState<number>(1.5);
  const [minUsdt, setMinUsdt] = useState<number>(10);

  const [history, setHistory] = useState<RateLog[]>([]);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRate = localStorage.getItem("nikopay_fx_rate") || "1350";
      const storedFee = localStorage.getItem("nikopay_fx_fee") || "1.5";
      const storedMin = localStorage.getItem("nikopay_fx_min_usdt") || "10";
      const storedHistory = localStorage.getItem("nikopay_fx_history");

      setRate(parseFloat(storedRate));
      setFee(parseFloat(storedFee));
      setMinUsdt(parseFloat(storedMin));

      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      } else {
        localStorage.setItem(
          "nikopay_fx_history",
          JSON.stringify(SEED_HISTORY),
        );
        setHistory(SEED_HISTORY);
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError("");

    if (rate <= 0 || fee < 0 || minUsdt < 0) {
      setError("Please check that all values are valid positive numbers.");
      return;
    }

    try {
      localStorage.setItem("nikopay_fx_rate", rate.toString());
      localStorage.setItem("nikopay_fx_fee", fee.toString());
      localStorage.setItem("nikopay_fx_min_usdt", minUsdt.toString());

      const newLog: RateLog = {
        rate,
        fee,
        minUsdt,
        operator: "Super Admin",
        timestamp: new Date().toISOString(),
      };

      const updatedHistory = [newLog, ...history];
      setHistory(updatedHistory);
      localStorage.setItem(
        "nikopay_fx_history",
        JSON.stringify(updatedHistory),
      );

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to persist data. Check browser storage configurations.");
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Configuration Form Card */}
      <div className="lg:col-span-1 rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md h-fit">
        <h4 className="text-sm font-semibold text-foreground mb-4 font-mono uppercase tracking-wider text-niko-teal">
          Update Parameters
        </h4>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              USDT to RWF Base Rate
            </label>
            <div className="relative rounded-md border border-niko-border bg-background px-3 py-2 focus-within:border-niko-teal/50 transition-colors">
              <input
                type="number"
                step="any"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-mono text-sm text-foreground outline-none"
              />
              <span className="absolute right-3 top-2.5 font-mono text-xs text-niko-muted font-bold">
                RWF
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Service Fee Percent
            </label>
            <div className="relative rounded-md border border-niko-border bg-background px-3 py-2 focus-within:border-niko-teal/50 transition-colors">
              <input
                type="number"
                step="any"
                value={fee}
                onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-mono text-sm text-foreground outline-none"
              />
              <span className="absolute right-3 top-2.5 font-mono text-xs text-niko-muted font-bold">
                %
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Min USDT Deposit
            </label>
            <div className="relative rounded-md border border-niko-border bg-background px-3 py-2 focus-within:border-niko-teal/50 transition-colors">
              <input
                type="number"
                step="any"
                value={minUsdt}
                onChange={(e) => setMinUsdt(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-mono text-sm text-foreground outline-none"
              />
              <span className="absolute right-3 top-2.5 font-mono text-xs text-niko-muted font-bold">
                USDT
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans leading-relaxed">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-md bg-niko-teal/15 border border-niko-teal/20 text-niko-teal text-xs font-sans leading-relaxed">
              Parameters saved and active instantly!
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer"
          >
            Apply Config
          </button>
        </form>
      </div>

      {/* History Log Card */}
      <div className="lg:col-span-2 rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
        <h4 className="text-sm font-semibold text-foreground mb-4 font-mono uppercase tracking-wider text-niko-teal">
          Rate Adjustment Log
        </h4>

        <div className="overflow-x-auto rounded border border-niko-border/20 bg-background/50">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-niko-border/30 bg-niko-surface/20 font-mono uppercase text-niko-muted">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Base Rate</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Min USDT</th>
                <th className="px-4 py-3 text-right">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-niko-border/10 font-mono text-foreground">
              {history.map((log, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-niko-surface/10 transition-colors"
                >
                  <td className="px-4 py-3 text-foreground/80 font-sans">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    1 USDT = {log.rate} RWF
                  </td>
                  <td className="px-4 py-3 font-semibold text-niko-teal-bright">
                    {log.fee}%
                  </td>
                  <td className="px-4 py-3">{log.minUsdt} USDT</td>
                  <td className="px-4 py-3 text-right font-sans text-niko-muted">
                    {log.operator}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
