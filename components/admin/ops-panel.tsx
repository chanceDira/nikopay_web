"use client";

import { useState } from "react";
import type { ChainScanResult } from "@/lib/scan-deposits";
import {
  formatPayoutRunSummary,
  type PayoutRunSummaryInput,
} from "@/lib/admin-metrics";

type OpState = "idle" | "running" | "done" | "error";

type ScanResponse = { scans: ChainScanResult[] };
type PayoutsResponse = { payouts: PayoutRunSummaryInput[] };

export function AdminOpsPanel() {
  const [scanState, setScanState] = useState<OpState>("idle");
  const [payoutsState, setPayoutsState] = useState<OpState>("idle");
  const [scanResult, setScanResult] = useState<string>("");
  const [payoutsResult, setPayoutsResult] = useState<string>("");

  const runScan = async () => {
    setScanState("running");
    setScanResult("");
    const res = await fetch("/api/admin/ops?op=scan&chain=base", {
      method: "POST",
    });
    const json = (await res.json()) as { data?: ScanResponse; error?: string };
    if (!res.ok || !json.data) {
      setScanResult(json.error ?? "Scan failed.");
      setScanState("error");
      return;
    }
    const scan = json.data.scans[0];
    if (!scan) {
      setScanResult("No scan result.");
      setScanState("done");
      return;
    }
    if (!scan.ok) {
      setScanResult(scan.reason);
      setScanState("error");
      return;
    }
    if ("skipped" in scan) {
      setScanResult(`Skipped: ${scan.reason}`);
    } else {
      setScanResult(
        `Blocks ${scan.fromBlock} to ${scan.toBlock}. Found ${scan.found} deposit(s).`,
      );
    }
    setScanState("done");
  };

  const runPayouts = async () => {
    setPayoutsState("running");
    setPayoutsResult("");
    const res = await fetch("/api/admin/ops?op=payouts", {
      method: "POST",
    });
    const json = (await res.json()) as {
      data?: PayoutsResponse;
      error?: string;
    };
    if (!res.ok || !json.data) {
      setPayoutsResult(json.error ?? "Payouts failed.");
      setPayoutsState("error");
      return;
    }
    setPayoutsResult(formatPayoutRunSummary(json.data.payouts));
    setPayoutsState("done");
  };

  return (
    <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
      <h4 className="text-sm font-semibold font-mono uppercase tracking-wider text-niko-teal mb-5">
        Operations
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <button
            type="button"
            disabled={scanState === "running"}
            onClick={() => void runScan()}
            className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold rounded-md text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {scanState === "running" ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            ) : null}
            Run deposit scan (Base)
          </button>
          {scanResult && (
            <p
              className={`text-[11px] font-mono px-1 ${scanState === "error" ? "text-red-400" : "text-niko-teal"}`}
            >
              {scanResult}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={payoutsState === "running"}
            onClick={() => void runPayouts()}
            className="w-full py-2.5 bg-niko-teal/10 hover:bg-niko-teal/20 text-niko-teal border border-niko-teal/30 font-bold rounded-md text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {payoutsState === "running" ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-niko-teal border-t-transparent" />
            ) : null}
            Run payouts
          </button>
          {payoutsResult && (
            <p
              className={`text-[11px] font-mono px-1 ${payoutsState === "error" ? "text-red-400" : "text-niko-teal"}`}
            >
              {payoutsResult}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
