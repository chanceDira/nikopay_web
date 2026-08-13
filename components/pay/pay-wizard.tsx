"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createMockIntent } from "@/lib/fixtures";
import type { ChainId } from "@/lib/settlement/types";
import { formatRwf, formatUsdt } from "@/lib/rates";

type Step = 1 | 2 | 3 | 4;

const RWANDA_MSISDN_REGEX = /^(?:\+250|0)?7[8932]\d{7}$/;

const CopyIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-4 w-4 text-niko-teal"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

export function PayWizard() {
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [chain, setChain] = useState<ChainId>("polygon");
  const [amount, setAmount] = useState<string>("100");
  const [msisdn, setMsisdn] = useState<string>("");
  const [formattedMsisdn, setFormattedMsisdn] = useState<string>("");

  // Validation errors
  const [amountError, setAmountError] = useState<string>("");
  const [msisdnError, setMsisdnError] = useState<string>("");

  // Created intent
  const [createdIntentId, setCreatedIntentId] = useState<string>("");
  const [createdIntentAddress, setCreatedIntentAddress] = useState<string>("");

  // Countdown timer for Step 4
  const [timeLeft, setTimeLeft] = useState<number>(20 * 60); // 20 minutes in seconds

  // Rates & calculations
  const usdtAmount = parseFloat(amount) || 0;
  const rate = 1350;
  const feePercent = 1.5;
  const grossRwf = usdtAmount * rate;
  const feeRwf = Math.round(grossRwf * (feePercent / 100));
  const netRwf = grossRwf - feeRwf;

  // Validate Amount
  const validateAmount = () => {
    if (!amount || isNaN(usdtAmount) || usdtAmount <= 0) {
      setAmountError("Please enter a valid amount");
      return false;
    }
    if (usdtAmount < 10) {
      setAmountError("Minimum amount is 10 USDT");
      return false;
    }
    setAmountError("");
    return true;
  };

  // Validate MSISDN
  const validateMsisdn = () => {
    if (!msisdn) {
      setMsisdnError("Mobile Money number is required");
      return false;
    }
    if (!RWANDA_MSISDN_REGEX.test(msisdn.replace(/\s+/g, ""))) {
      setMsisdnError(
        "Please enter a valid Rwandan Mobile Money number (e.g. 078XXXXXXX)",
      );
      return false;
    }
    setMsisdnError("");
    return true;
  };

  // Format and save MSISDN
  const handleMsisdnChange = (value: string) => {
    setMsisdn(value);
    // Clean and standardise format for preview
    const clean = value.replace(/\s+/g, "");
    if (clean.startsWith("0")) {
      setFormattedMsisdn(
        `+250 ${clean.substring(1, 4)} ${clean.substring(4, 7)} ${clean.substring(7)}`,
      );
    } else if (clean.startsWith("+250")) {
      setFormattedMsisdn(
        `+250 ${clean.substring(4, 7)} ${clean.substring(7, 10)} ${clean.substring(10)}`,
      );
    } else {
      setFormattedMsisdn(value);
    }
  };

  // Handle Step Navigation
  const handleNextStep = () => {
    if (step === 1) {
      if (validateAmount()) setStep(2);
    } else if (step === 2) {
      if (validateMsisdn()) setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1 && step < 4) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  // Create Intent (Confirm Step)
  const handleConfirmPayment = () => {
    // Clean MSISDN format to raw string
    const cleanMsisdn = msisdn.replace(/\s+/g, "");
    const standardMsisdn = cleanMsisdn.startsWith("0")
      ? `+250${cleanMsisdn.substring(1)}`
      : cleanMsisdn.startsWith("+")
        ? cleanMsisdn
        : `+250${cleanMsisdn}`;

    const intent = createMockIntent({
      usdtAmount,
      chain,
      msisdn: standardMsisdn,
    });

    setCreatedIntentId(intent.id);
    setCreatedIntentAddress(intent.treasuryAddress);
    setStep(4);
  };

  // Copy helper
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const copyToClipboard = (text: string, type: "address" | "amount") => {
    navigator.clipboard.writeText(text);
    if (type === "address") {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (step !== 4) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Step Indicator Header */}
      <div className="mb-8 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
              step >= 1
                ? "bg-niko-teal text-niko-navy shadow-[0_0_12px_rgba(0,212,200,0.4)]"
                : "bg-niko-surface border border-niko-border text-niko-muted"
            }`}
          >
            {step > 1 ? <CheckIcon /> : "1"}
          </span>
          <span
            className={`text-xs font-medium ${step >= 1 ? "text-foreground" : "text-niko-muted"}`}
          >
            Amount
          </span>
        </div>
        <div className="flex-1 h-px bg-niko-border mx-4" />
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
              step >= 2
                ? "bg-niko-teal text-niko-navy shadow-[0_0_12px_rgba(0,212,200,0.4)]"
                : "bg-niko-surface border border-niko-border text-niko-muted"
            }`}
          >
            {step > 2 ? <CheckIcon /> : "2"}
          </span>
          <span
            className={`text-xs font-medium ${step >= 2 ? "text-foreground" : "text-niko-muted"}`}
          >
            Details
          </span>
        </div>
        <div className="flex-1 h-px bg-niko-border mx-4" />
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
              step >= 3
                ? "bg-niko-teal text-niko-navy shadow-[0_0_12px_rgba(0,212,200,0.4)]"
                : "bg-niko-surface border border-niko-border text-niko-muted"
            }`}
          >
            {step > 3 ? <CheckIcon /> : "3"}
          </span>
          <span
            className={`text-xs font-medium ${step >= 3 ? "text-foreground" : "text-niko-muted"}`}
          >
            Confirm
          </span>
        </div>
        <div className="flex-1 h-px bg-niko-border mx-4" />
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
              step === 4
                ? "bg-niko-teal text-niko-navy shadow-[0_0_12px_rgba(0,212,200,0.4)]"
                : "bg-niko-surface border border-niko-border text-niko-muted"
            }`}
          >
            4
          </span>
          <span
            className={`text-xs font-medium ${step === 4 ? "text-foreground" : "text-niko-muted"}`}
          >
            Pay
          </span>
        </div>
      </div>

      {/* Step 1: Amount & Chain */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground">
              Select Network
            </label>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setChain("polygon")}
                className={`flex flex-col items-start p-4 rounded-md border transition-all text-left ${
                  chain === "polygon"
                    ? "border-niko-teal bg-niko-teal/5 shadow-[0_0_15px_rgba(0,212,200,0.05)]"
                    : "border-niko-border bg-background hover:bg-niko-surface/35"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${chain === "polygon" ? "bg-niko-teal animate-pulse-glow" : "bg-niko-muted"}`}
                  />
                  <span className="font-semibold">Polygon</span>
                </div>
                <span className="mt-1 text-xs text-niko-muted">USDT (PoS)</span>
              </button>

              <button
                type="button"
                onClick={() => setChain("base")}
                className={`flex flex-col items-start p-4 rounded-md border transition-all text-left ${
                  chain === "base"
                    ? "border-niko-teal bg-niko-teal/5 shadow-[0_0_15px_rgba(0,212,200,0.05)]"
                    : "border-niko-border bg-background hover:bg-niko-surface/35"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${chain === "base" ? "bg-niko-teal animate-pulse-glow" : "bg-niko-muted"}`}
                  />
                  <span className="font-semibold">Base</span>
                </div>
                <span className="mt-1 text-xs text-niko-muted">
                  USDT Bridged
                </span>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="usdt-input"
              className="text-sm font-medium text-foreground"
            >
              Send Amount
            </label>
            <div className="relative mt-2 flex items-center rounded-md border border-niko-border bg-background px-4 py-3.5 focus-within:border-niko-teal/50 transition-colors">
              <input
                id="usdt-input"
                type="number"
                min="10"
                step="any"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (amountError) setAmountError("");
                }}
                onBlur={validateAmount}
                className="w-full bg-transparent font-mono text-xl font-bold text-foreground outline-none placeholder:text-niko-muted/40"
                placeholder="0.00"
              />
              <span className="ml-3 font-semibold text-niko-teal text-sm">
                USDT
              </span>
            </div>
            {amountError && (
              <p className="mt-2 text-xs text-rose-400">{amountError}</p>
            )}
            <p className="mt-2 text-xs text-niko-muted flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-niko-teal" />
              1 USDT = {rate.toLocaleString()} RWF
            </p>
          </div>

          <div className="rounded-md border border-niko-teal/10 bg-niko-teal/5 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-niko-muted">Gross Amount</span>
              <span className="font-mono">{formatRwf(grossRwf)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-niko-muted">
                Service Fee ({feePercent}%)
              </span>
              <span className="font-mono text-rose-400">
                -{formatRwf(feeRwf)}
              </span>
            </div>
            <div className="h-px bg-niko-border/40 my-1" />
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-foreground">
                Net Payout to Recipient
              </span>
              <span className="text-lg font-bold text-niko-teal-bright font-mono">
                {usdtAmount >= 10 ? formatRwf(netRwf) : "-"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            className="w-full py-4 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(0,212,200,0.15)] flex justify-center items-center gap-2"
          >
            Continue to Details
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Step 2: Recipient Details */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label
              htmlFor="msisdn-input"
              className="text-sm font-medium text-foreground"
            >
              Recipient Mobile Money Number
            </label>
            <p className="text-xs text-niko-muted mt-1">
              Provide the MTN Rwanda number where the RWF payout should be
              deposited.
            </p>
            <div className="relative mt-3 flex items-center rounded-md border border-niko-border bg-background px-4 py-3.5 focus-within:border-niko-teal/50 transition-colors">
              <input
                id="msisdn-input"
                type="text"
                value={msisdn}
                onChange={(e) => {
                  handleMsisdnChange(e.target.value);
                  if (msisdnError) setMsisdnError("");
                }}
                onBlur={validateMsisdn}
                className="w-full bg-transparent font-mono text-lg font-semibold text-foreground outline-none placeholder:text-niko-muted/40"
                placeholder="e.g. 0787259588"
              />
              <span className="ml-3 font-semibold text-niko-teal text-xs tracking-wider uppercase">
                MTN MoMo
              </span>
            </div>
            {msisdnError && (
              <p className="mt-2 text-xs text-rose-400">{msisdnError}</p>
            )}

            {formattedMsisdn && !msisdnError && (
              <div className="mt-3 p-3 rounded-lg bg-niko-surface/80 border border-niko-border/40 flex justify-between items-center">
                <span className="text-xs text-niko-muted">
                  Formatted Address:
                </span>
                <span className="text-xs font-mono font-bold text-niko-teal-bright">
                  {formattedMsisdn}
                </span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-md border border-yellow-500/10 bg-yellow-500/5 text-xs text-amber-300 leading-relaxed flex gap-3">
            <svg
              className="h-5 w-5 shrink-0 text-amber-400"
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
            <span>
              <strong>Double-check the wallet/phone details:</strong> If you
              enter an incorrect Mobile Money number, the transaction will fail
              or, in worst cases, deposit money to the wrong user. We cannot
              reverse completed payouts.
            </span>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handlePrevStep}
              className="w-1/3 py-4 border border-niko-border hover:border-niko-teal/30 hover:bg-niko-surface/40 text-foreground font-semibold rounded-md transition-all"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="w-2/3 py-4 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all shadow-[0_0_20px_rgba(0,212,200,0.15)] flex justify-center items-center gap-2"
            >
              Review Payment
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Confirmation */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-md border border-niko-border bg-background p-6 space-y-4">
            <h3 className="text-sm font-semibold text-niko-teal uppercase tracking-wider mb-2">
              Transaction Details
            </h3>

            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div className="text-niko-muted">Destination Chain</div>
              <div className="font-semibold text-right capitalize">{chain}</div>

              <div className="text-niko-muted">You Send</div>
              <div className="font-bold text-right text-foreground font-mono">
                {formatUsdt(usdtAmount)}
              </div>

              <div className="text-niko-muted">Exchange Rate</div>
              <div className="text-right font-mono text-foreground">
                1 USDT = {rate.toLocaleString()} RWF
              </div>

              <div className="text-niko-muted">
                Processing Fee ({feePercent}%)
              </div>
              <div className="text-right font-mono text-rose-400">
                -{formatRwf(feeRwf)}
              </div>

              <div className="col-span-2 h-px bg-niko-border/60 my-2" />

              <div className="text-base font-semibold text-foreground">
                Recipient Receives
              </div>
              <div className="text-xl font-bold text-niko-teal-bright text-right font-mono">
                {formatRwf(netRwf)}
              </div>

              <div className="text-niko-muted">MTN Wallet Number</div>
              <div className="font-mono font-bold text-right text-foreground">
                {formattedMsisdn}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handlePrevStep}
              className="w-1/3 py-4 border border-niko-border hover:border-niko-teal/30 hover:bg-niko-surface/40 text-foreground font-semibold rounded-md transition-all"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmPayment}
              className="w-2/3 py-4 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all shadow-[0_0_20px_rgba(0,212,200,0.2)] flex justify-center items-center gap-2"
            >
              Confirm & Create Intent
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Pay Instructions */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-niko-teal/10 border border-niko-teal/30 animate-pulse">
              <svg
                className="h-7 w-7 text-niko-teal animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-bold text-foreground">
              Awaiting Deposit
            </h3>
            <p className="mt-1 text-sm text-niko-muted">
              Please transfer the exact USDT amount to the treasury wallet
              below.
            </p>
          </div>

          <div className="rounded-md border border-niko-teal/20 bg-niko-surface p-5 sm:p-6 space-y-5">
            {/* Countdown timer */}
            <div className="flex justify-between items-center pb-4 border-b border-niko-border/60">
              <span className="text-sm text-niko-muted">
                Time remaining to pay:
              </span>
              <span className="font-mono text-lg font-bold text-niko-teal-bright">
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Treasury Address */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-niko-muted uppercase tracking-wider">
                <span>NikoPay Treasury Address ({chain})</span>
                {copiedAddress && (
                  <span className="text-niko-teal lowercase font-normal">
                    copied!
                  </span>
                )}
              </div>
              <div className="flex gap-2 items-center rounded-md bg-background border border-niko-border px-3.5 py-3">
                <span className="font-mono text-sm text-foreground overflow-x-auto whitespace-nowrap scrollbar-none flex-1 select-all">
                  {createdIntentAddress}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(createdIntentAddress, "address")
                  }
                  className="p-2 text-niko-muted hover:text-niko-teal border border-niko-border hover:border-niko-teal/30 rounded-lg hover:bg-niko-surface transition-all flex items-center justify-center"
                  aria-label="Copy Address"
                >
                  {copiedAddress ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-niko-muted uppercase tracking-wider">
                <span>Amount to send (USDT)</span>
                {copiedAmount && (
                  <span className="text-niko-teal lowercase font-normal">
                    copied!
                  </span>
                )}
              </div>
              <div className="flex gap-2 items-center rounded-md bg-background border border-niko-border px-3.5 py-3">
                <span className="font-mono text-lg font-bold text-foreground flex-1">
                  {usdtAmount.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(usdtAmount.toFixed(2), "amount")
                  }
                  className="p-2 text-niko-muted hover:text-niko-teal border border-niko-border hover:border-niko-teal/30 rounded-lg hover:bg-niko-surface transition-all flex items-center justify-center"
                  aria-label="Copy Amount"
                >
                  {copiedAmount ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-md border border-niko-teal/20 bg-niko-teal/5 text-xs text-niko-muted leading-relaxed flex items-start gap-3">
            <svg
              className="h-5 w-5 shrink-0 text-niko-teal"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-semibold text-foreground mb-1">
                Instant Payout Details
              </p>
              Once your deposit is detected on the blockchain, we will
              automatically payout{" "}
              <span className="text-foreground font-semibold">
                {formatRwf(netRwf)}
              </span>{" "}
              to{" "}
              <span className="text-foreground font-semibold font-mono">
                {formattedMsisdn}
              </span>{" "}
              via Mobile Money.
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => router.push(`/app/payments/${createdIntentId}`)}
              className="w-full py-4 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all shadow-[0_0_20px_rgba(0,212,200,0.2)] flex justify-center items-center gap-2"
            >
              I have transferred USDT
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
            <p className="text-center text-xs text-niko-muted">
              We monitor the block headers constantly. Payout status updates in
              real-time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
