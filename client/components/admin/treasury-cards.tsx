"use client";

import { useEffect, useState } from "react";

export function AdminTreasuryCards() {
  const [momoBalance, setMomoBalance] = useState<number>(4500000); // 4.5M RWF
  const [polygonBalance, setPolygonBalance] = useState<number>(25000); // 25,000 USDT
  const [baseBalance, setBaseBalance] = useState<number>(18500); // 18,500 USDT

  const [showTopUpModal, setShowTopUpModal] = useState<boolean>(false);
  const [topUpAmount, setTopUpAmount] = useState<string>("");
  const [modalSuccess, setModalSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedMomo =
        localStorage.getItem("nikopay_momo_balance") || "4500000";
      const storedPoly =
        localStorage.getItem("nikopay_polygon_balance") || "25000";
      const storedBase =
        localStorage.getItem("nikopay_base_balance") || "18500";

      setMomoBalance(parseInt(storedMomo, 10));
      setPolygonBalance(parseFloat(storedPoly));
      setBaseBalance(parseFloat(storedBase));
    }
  }, []);

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(topUpAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    const newMomo = momoBalance + amount;
    setMomoBalance(newMomo);
    localStorage.setItem("nikopay_momo_balance", newMomo.toString());

    setModalSuccess(true);
    setTimeout(() => {
      setModalSuccess(false);
      setShowTopUpModal(false);
      setTopUpAmount("");
    }, 1500);
  };

  const formatRwf = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "RWF",
      maximumFractionDigits: 0,
    })
      .format(val)
      .replace("RWF", "RWF ");
  };

  const formatUsdt = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    })
      .format(val)
      .replace("$", "$ ");
  };

  const isLowMomo = momoBalance < 1000000;

  return (
    <div className="space-y-6">
      {/* Low Liquidity Warn Box */}
      {isLowMomo && (
        <div className="p-4 rounded-md border border-[var(--niko-warning-border)] bg-[var(--niko-warning-bg)] text-xs text-[var(--niko-warning-text)] leading-relaxed flex gap-3 shadow-sm animate-pulse">
          <svg
            className="h-5 w-5 shrink-0 text-[var(--niko-warning-text)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <strong className="font-semibold block mb-0.5">
              Critical Action Required: Low MoMo Liquidity
            </strong>
            The MTN Mobile Money RWF pool is running low (
            {formatRwf(momoBalance)}). Payouts for large intents could fail.
            Please initiate a bank transfer transfer and log a liquidity top-up
            immediately.
          </div>
        </div>
      )}

      {/* Vault Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* MTN MoMo balance */}
        <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md flex flex-col justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-niko-muted flex justify-between items-center">
              MTN Rwanda Pool
              <span
                className={`h-2 w-2 rounded-full ${isLowMomo ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`}
              />
            </p>
            <h3 className="text-2xl font-bold font-mono text-foreground mt-3">
              {formatRwf(momoBalance)}
            </h3>
            <p className="text-xs text-niko-muted mt-1 font-sans">
              Local currency pool for mobile money payouts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTopUpModal(true)}
            className="w-full mt-6 py-2 bg-niko-teal/10 hover:bg-niko-teal/20 text-niko-teal border border-niko-teal/30 hover:border-niko-teal/50 font-semibold rounded-md text-xs transition-all cursor-pointer flex justify-center items-center gap-1.5"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Log Payout Top-up
          </button>
        </div>

        {/* Polygon USDT balance */}
        <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
          <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
            Polygon USDT Vault
          </p>
          <h3 className="text-2xl font-bold font-mono text-foreground mt-3">
            {formatUsdt(polygonBalance)}
          </h3>
          <p className="text-xs text-niko-muted mt-1 font-sans">
            Company holdings address (USDT) on Polygon PoS chain.
          </p>
          <div className="mt-6 flex items-center justify-between text-xs text-niko-muted font-mono border-t border-niko-border/10 pt-4">
            <span>Fees Collected:</span>
            <span className="text-foreground">
              {formatUsdt(polygonBalance * 0.015)}
            </span>
          </div>
        </div>

        {/* Base USDT balance */}
        <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
          <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
            Base USDT Vault
          </p>
          <h3 className="text-2xl font-bold font-mono text-foreground mt-3">
            {formatUsdt(baseBalance)}
          </h3>
          <p className="text-xs text-niko-muted mt-1 font-sans">
            Company holdings address (USDT) on Coinbase Base chain.
          </p>
          <div className="mt-6 flex items-center justify-between text-xs text-niko-muted font-mono border-t border-niko-border/10 pt-4">
            <span>Fees Collected:</span>
            <span className="text-foreground">
              {formatUsdt(baseBalance * 0.015)}
            </span>
          </div>
        </div>
      </div>

      {/* Top-up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-xl p-6 shadow-2xl space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground font-mono uppercase tracking-wider text-niko-teal">
                Record MoMo Top-up
              </h4>
              <p className="text-xs text-niko-muted mt-1">
                Log a liquidity top-up transfer made to MTN Rwanda merchant
                wallet.
              </p>
            </div>

            <form onSubmit={handleTopUpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Top-up Amount (RWF)
                </label>
                <div className="relative rounded-md border border-niko-border bg-background px-3 py-2 focus-within:border-niko-teal/50 transition-colors">
                  <input
                    type="number"
                    required
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="e.g. 1000000"
                    className="w-full bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-niko-muted/40"
                  />
                  <span className="absolute right-3 top-2.5 font-mono text-xs text-niko-muted font-bold">
                    RWF
                  </span>
                </div>
              </div>

              {modalSuccess && (
                <div className="p-3 rounded-md bg-niko-teal/15 border border-niko-teal/20 text-niko-teal text-xs font-sans text-center">
                  Balance updated successfully!
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTopUpModal(false);
                    setTopUpAmount("");
                  }}
                  className="w-1/2 py-2.5 border border-niko-border hover:bg-niko-surface/50 text-foreground font-bold rounded-md text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSuccess}
                  className="w-1/2 py-2.5 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md text-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
