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
    <section className="niko-panel overflow-hidden">
      <div className="border-b border-niko-border/40 bg-niko-well/40 px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-foreground">Operations</h2>
        <p className="mt-1 text-xs text-niko-muted">
          Manual deposit scan and payout runner
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="text-xs font-medium text-indigo-500">Deposits</p>
          <button
            type="button"
            disabled={scanState === "running"}
            onClick={() => void runScan()}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-indigo-500/30 bg-indigo-500/10 py-2.5 text-xs font-semibold text-indigo-500 transition-colors hover:bg-indigo-500/20 disabled:opacity-50"
          >
            {scanState === "running" ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            ) : null}
            Run deposit scan (Base)
          </button>
          {scanResult ? (
            <p
              className={`mt-3 font-mono text-[11px] ${scanState === "error" ? "text-red-400" : "text-niko-muted"}`}
            >
              {scanResult}
            </p>
          ) : null}
        </div>

        <div className="rounded-md border border-niko-teal/25 bg-niko-teal/5 p-4">
          <p className="text-xs font-medium text-niko-teal">Payouts</p>
          <button
            type="button"
            disabled={payoutsState === "running"}
            onClick={() => void runPayouts()}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-niko-teal/30 bg-niko-teal/10 py-2.5 text-xs font-semibold text-niko-teal transition-colors hover:bg-niko-teal/20 disabled:opacity-50"
          >
            {payoutsState === "running" ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-niko-teal border-t-transparent" />
            ) : null}
            Run payouts
          </button>
          {payoutsResult ? (
            <p
              className={`mt-3 font-mono text-[11px] ${payoutsState === "error" ? "text-red-400" : "text-niko-muted"}`}
            >
              {payoutsResult}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
