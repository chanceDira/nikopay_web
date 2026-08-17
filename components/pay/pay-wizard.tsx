"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createMockIntent } from "@/lib/fixtures";
import { isStoredTrue, readLocal } from "@/lib/read-local";
import type { ChainId } from "@/lib/settlement/types";
import { formatRwf, formatUsdt } from "@/lib/rates";

type Step = 1 | 2 | 3 | 4;

const RWANDA_MSISDN_REGEX = /^(?:\+250|0)?7[8932]\d{7}$/;

const CheckIcon = () => (
  <svg
    className="h-4 w-4 text-niko-navy"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

export function PayWizard() {
  const router = useRouter();

  // Wizard state (3-step pay flow)
  const [step, setStep] = useState<Step>(1);
  const [chain, setChain] = useState<ChainId>("polygon");
  const [amount, setAmount] = useState<string>(""); // Starts empty, uses placeholder
  const [msisdn, setMsisdn] = useState<string>("");
  const [formattedMsisdn, setFormattedMsisdn] = useState<string>("");
  const [rate] = useState(() =>
    parseFloat(readLocal("nikopay_fx_rate", "1350")),
  );
  const [feePercent] = useState(() =>
    parseFloat(readLocal("nikopay_fx_fee", "1.5")),
  );

  // Web3 Wallet states
  const [walletConnected, setWalletConnected] = useState(() =>
    isStoredTrue("nikopay_wallet_connected"),
  );
  const [walletAddress, setWalletAddress] = useState(() =>
    isStoredTrue("nikopay_wallet_connected")
      ? "0x71c7656ec7ab88b098defb751b7401b5f6d8976f"
      : "",
  );
  const [walletName, setWalletName] = useState(() =>
    readLocal("nikopay_wallet_name", "MetaMask"),
  );
  const [connecting, setConnecting] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [modalState, setModalState] = useState<
    "confirm" | "submitting" | "broadcasting"
  >("confirm");

  // Validation errors
  const [amountError, setAmountError] = useState<string>("");
  const [msisdnError, setMsisdnError] = useState<string>("");

  // Local storage auth states
  const [authMethod] = useState(() =>
    readLocal("nikopay_auth_method", "wallet"),
  );
  const [emailVerified, setEmailVerified] = useState(() =>
    isStoredTrue("nikopay_email_verified"),
  );
  const [isWalletConnected, setIsWalletConnected] = useState(() =>
    isStoredTrue("nikopay_wallet_connected"),
  );

  // Modals for progressive gating
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [showConnectGateModal, setShowConnectGateModal] =
    useState<boolean>(false);

  // Email verification modal internal state
  const [modalEmail, setModalEmail] = useState<string>("");
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [modalOtp, setModalOtp] = useState<string>("");
  const [modalEmailLoading, setModalEmailLoading] = useState<boolean>(false);
  const [modalEmailError, setModalEmailError] = useState<string>("");

  // Wallet gate modal internal state
  const [gateWalletState, setGateWalletState] = useState<
    "idle" | "connecting" | "success"
  >("idle");
  const [gateSelectedWallet, setGateSelectedWallet] = useState<string | null>(
    null,
  );

  // Handle modal email submit (OTP request)
  const handleModalEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalEmailError("");

    if (!modalEmail || !modalEmail.includes("@")) {
      setModalEmailError("Please enter a valid email address.");
      return;
    }

    setModalEmailLoading(true);

    setTimeout(() => {
      setModalEmailLoading(false);
      setOtpSent(true);
    }, 1200);
  };

  // Handle modal OTP submit (Verify Code)
  const handleModalOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalEmailError("");

    if (modalOtp.length !== 6 || isNaN(Number(modalOtp))) {
      setModalEmailError("Verification code must be exactly 6 digits.");
      return;
    }

    setModalEmailLoading(true);

    setTimeout(() => {
      setModalEmailLoading(false);

      // Update local storage
      localStorage.setItem("nikopay_email_verified", "true");
      localStorage.setItem("nikopay_email_address", modalEmail);

      // Update state
      setEmailVerified(true);

      // Close email modal and navigate to step 2
      setShowEmailModal(false);
      setStep(2);
    }, 1200);
  };

  // Handle wallet gate connection
  const handleGateWalletConnect = (walletName: string) => {
    setGateSelectedWallet(walletName);
    setGateWalletState("connecting");

    setTimeout(() => {
      setGateWalletState("success");

      setTimeout(() => {
        // Update local storage
        localStorage.setItem("nikopay_wallet_connected", "true");
        localStorage.setItem("nikopay_wallet_name", walletName);

        // Update state
        setIsWalletConnected(true);
        setWalletConnected(true);
        setWalletName(walletName);
        setWalletAddress("0x71c7656ec7ab88b098defb751b7401b5f6d8976f");

        // Close wallet modal and navigate to step 2
        setShowConnectGateModal(false);
        setStep(2);
      }, 800);
    }, 1500);
  };

  // Rates & calculations (RWF-first)
  const rwfPayout = parseFloat(amount) || 0;

  // Calculate USDT needed to settle the exact RWF payout amount
  const usdtAmount = rwfPayout / (rate * (1 - feePercent / 100));
  const grossRwf = usdtAmount * rate;
  const feeRwf = grossRwf - rwfPayout;
  const netRwf = rwfPayout;

  // Validate Amount
  const validateAmount = () => {
    if (!amount || isNaN(rwfPayout) || rwfPayout <= 0) {
      setAmountError("Please enter a valid payout amount");
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
      if (validateAmount()) {
        // Intercept for progressive gating at Step 1 (Continue to Details)
        if (authMethod === "wallet" && !emailVerified) {
          setShowEmailModal(true);
          return;
        }
        if (authMethod === "email" && !isWalletConnected) {
          setShowConnectGateModal(true);
          return;
        }
        setStep(2);
      }
    } else if (step === 2) {
      if (validateMsisdn()) {
        setStep(3);
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  // Connect Web3 Wallet Simulator
  const handleConnectWallet = () => {
    setConnecting(true);
    setTimeout(() => {
      setWalletConnected(true);
      setWalletAddress("0x71c7656ec7ab88b098defb751b7401b5f6d8976f");
      setWalletName("MetaMask");
      localStorage.setItem("nikopay_wallet_name", "MetaMask");
      setConnecting(false);
    }, 1000);
  };

  // Trigger MetaMask Transfer Dialog
  const handleConfirmTransfer = () => {
    setShowWalletModal(true);
    setModalState("confirm");
  };

  // Confirm and route to tracking
  const handleModalConfirm = () => {
    setModalState("submitting");

    setTimeout(() => {
      setModalState("broadcasting");

      setTimeout(() => {
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
          walletAddress: walletAddress || undefined,
        });

        setShowWalletModal(false);
        router.push(`/app/payments/${intent.id}`);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Step Indicator Header (3 Steps) */}
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
              step === 3
                ? "bg-niko-teal text-niko-navy shadow-[0_0_12px_rgba(0,212,200,0.4)]"
                : "bg-niko-surface border border-niko-border text-niko-muted"
            }`}
          >
            3
          </span>
          <span
            className={`text-xs font-medium ${step === 3 ? "text-foreground" : "text-niko-muted"}`}
          >
            Confirm & Pay
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
              htmlFor="rwf-input"
              className="text-sm font-medium text-foreground"
            >
              Payout Amount (Recipient Receives)
            </label>
            <div className="relative mt-2 flex items-center rounded-md border border-niko-border bg-background px-4 py-3.5 focus-within:border-niko-teal/50 transition-colors">
              <input
                id="rwf-input"
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) {
                    setAmount(val);
                    if (amountError) setAmountError("");
                  }
                }}
                onBlur={validateAmount}
                className="w-full bg-transparent font-mono text-xl font-bold text-foreground outline-none placeholder:text-niko-muted/40"
                placeholder="0"
              />
              <span className="ml-3 font-semibold text-niko-teal text-sm">
                RWF
              </span>
            </div>
            {amountError && (
              <p className="mt-2 text-xs text-red-400">{amountError}</p>
            )}
            <p className="mt-2 text-xs text-niko-muted flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-niko-teal" />
              1 USDT = {rate.toLocaleString()} RWF (Illustrative Rate)
            </p>
          </div>

          <div className="rounded-md border border-niko-teal/10 bg-niko-teal/5 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-niko-muted">Recipient Receives</span>
              <span className="font-mono text-foreground font-semibold">
                {rwfPayout > 0 ? formatRwf(netRwf) : "-"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-niko-muted">
                Service Fee ({feePercent}%)
              </span>
              <span className="font-mono text-niko-muted">
                {rwfPayout > 0 ? `+${formatRwf(feeRwf)}` : "-"}
              </span>
            </div>
            <div className="h-px bg-niko-border/40 my-1" />
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-foreground">
                Total USDT You Send (from wallet)
              </span>
              <span className="text-lg font-bold text-niko-teal-bright font-mono">
                {rwfPayout > 0 ? formatUsdt(usdtAmount) : "-"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            className="w-full py-4 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all flex justify-center items-center gap-2"
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
                inputMode="tel"
                value={msisdn}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\+?\d*$/.test(val)) {
                    handleMsisdnChange(val);
                    if (msisdnError) setMsisdnError("");
                  }
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
              <p className="mt-2 text-xs text-red-400">{msisdnError}</p>
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

          <div className="p-4 rounded-md border border-[var(--niko-warning-border)] bg-[var(--niko-warning-bg)] text-xs text-[var(--niko-warning-text)] leading-relaxed flex gap-3">
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
          <div className="rounded-md border border-niko-border bg-background p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-niko-border/60 pb-3">
              <h3 className="text-sm font-semibold text-niko-teal uppercase tracking-wider">
                Transaction Details
              </h3>
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-2 w-2 rounded-full ${walletConnected ? "bg-niko-teal animate-pulse-glow" : "bg-red-500 animate-pulse"}`}
                />
                <span className="text-xs text-niko-muted font-medium">
                  {walletConnected ? "Wallet Connected" : "Wallet Disconnected"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div className="text-niko-muted">Destination Chain</div>
              <div className="font-semibold text-right capitalize">{chain}</div>

              {walletConnected && (
                <>
                  <div className="text-niko-muted">Connected Wallet</div>
                  <div className="font-mono font-semibold text-right text-niko-teal-bright">
                    {walletAddress.substring(0, 6)}...
                    {walletAddress.substring(walletAddress.length - 4)}
                  </div>
                </>
              )}

              <div className="text-niko-muted">Recipient Receives</div>
              <div className="font-semibold text-right text-foreground font-mono">
                {formatRwf(netRwf)}
              </div>

              <div className="text-niko-muted">Exchange Rate</div>
              <div className="text-right font-mono text-foreground">
                1 USDT = {rate.toLocaleString()} RWF
              </div>

              <div className="text-niko-muted">
                Processing Fee ({feePercent}%)
              </div>
              <div className="text-right font-mono text-niko-muted">
                +{formatRwf(feeRwf)}
              </div>

              <div className="col-span-2 h-px bg-niko-border/60 my-1" />

              <div className="text-base font-bold text-foreground">
                Total USDT to Send
              </div>
              <div className="text-xl font-bold text-niko-teal-bright text-right font-mono animate-pulse-glow">
                {formatUsdt(usdtAmount)}
              </div>

              <div className="text-niko-muted">MTN Wallet Number</div>
              <div className="font-mono font-bold text-right text-foreground">
                {formattedMsisdn}
              </div>
            </div>
          </div>

          {/* Disclaimer (Shows Connect Wallet inside it when not connected) */}
          {!walletConnected && (
            <div className="p-4 rounded-md border border-niko-teal/20 bg-niko-teal/5 text-xs text-niko-muted leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 shrink-0 text-niko-teal mt-0.5"
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
                    Wallet Connection Required
                  </p>
                  Connect your web3 crypto wallet to authorize the transfer of{" "}
                  <span className="text-foreground font-semibold">
                    {usdtAmount.toFixed(2)} USDT
                  </span>{" "}
                  directly from your browser.
                </div>
              </div>

              <button
                type="button"
                onClick={handleConnectWallet}
                disabled={connecting}
                className="shrink-0 py-2.5 px-4 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-niko-navy border-t-transparent" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect Wallet
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-1.343 3-3s-1-3-3-3m0 6a3 3 0 01-3-3V9"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Unified Action Button Row */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handlePrevStep}
              className="w-1/3 py-4 border border-niko-border hover:border-niko-teal/30 hover:bg-niko-surface/40 text-foreground font-semibold rounded-md transition-all text-sm"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!walletConnected}
              onClick={handleConfirmTransfer}
              className={`w-2/3 py-4 font-bold rounded-md transition-all flex justify-center items-center gap-2 text-sm ${
                walletConnected
                  ? "bg-niko-teal hover:bg-niko-teal-bright text-niko-navy cursor-pointer"
                  : "bg-niko-surface border border-niko-border text-niko-muted opacity-50 cursor-not-allowed"
              }`}
            >
              Confirm & Transfer
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* MetaMask Interactive Modal Overlay */}
      {showWalletModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/20 p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-xl p-6 space-y-6 shadow-2xl relative z-55 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-niko-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Image
                  src={
                    walletName === "Coinbase Wallet"
                      ? "/logos/coinbase-logo.webp"
                      : walletName === "WalletConnect"
                        ? "/logos/walletconnect-logo.png"
                        : "/logos/metamask-logo.png"
                  }
                  alt={walletName}
                  width={20}
                  height={20}
                  className="h-5 w-5 object-contain rounded-md"
                />
                <span className="text-sm text-foreground">{walletName}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-niko-teal/15 px-2 py-0.5 text-xs text-niko-teal border border-niko-teal/20">
                <span className="h-1.5 w-1.5 rounded-full bg-niko-teal animate-pulse" />
                {chain === "polygon" ? "Polygon PoS" : "Base Network"}
              </span>
            </div>

            {/* Modal Body */}
            {modalState === "confirm" ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs text-niko-muted uppercase tracking-wider">
                    Signature Request
                  </h4>
                  <p className="mt-1.5 text-xs text-foreground leading-relaxed">
                    Confirm you want to authorize the transfer of USDT from your
                    wallet to the secure NikoPay treasury pool.
                  </p>
                </div>

                <div className="rounded-md border border-niko-border bg-background p-4 space-y-2.5">
                  <div className="flex justify-between text-xs text-niko-muted">
                    <span>From (Your Wallet)</span>
                    <span className="font-mono text-foreground">
                      {walletAddress.substring(0, 6)}...
                      {walletAddress.substring(walletAddress.length - 4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-niko-muted">
                    <span>To (NikoPay Vault)</span>
                    <span className="font-mono text-foreground">
                      {chain === "polygon" ? "0x742d...f44e" : "0x839d...99f"}
                    </span>
                  </div>
                  <div className="h-px bg-niko-border/40 my-1" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-foreground">Amount</span>
                    <span className="text-lg text-niko-teal font-mono">
                      {formatUsdt(usdtAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-niko-muted mt-1">
                    <span>Estimated Gas Fee</span>
                    <span className="font-mono text-foreground">
                      ~0.005 MATIC
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWalletModal(false)}
                    className="w-1/2 py-2.5 border border-niko-border hover:bg-niko-surface/50 text-foreground rounded-md text-xs font-bold transition-all"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleModalConfirm}
                    className="w-1/2 py-2.5 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md text-xs transition-all"
                  >
                    Confirm Sign
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-niko-teal border-t-transparent" />
                <div className="text-center">
                  <p className="text-sm text-foreground">
                    {modalState === "submitting"
                      ? `Awaiting ${walletName} Signature...`
                      : "Broadcasting on-chain..."}
                  </p>
                  <p className="text-xs text-niko-muted mt-1 max-w-[220px] mx-auto">
                    Please approve the transaction inside the {walletName}{" "}
                    browser extension window.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EMAIL VERIFICATION GATE MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/20 p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-xl p-6 space-y-4 shadow-2xl relative z-55">
            <div className="flex items-center justify-between border-b border-niko-border/60 pb-3">
              <span className="text-base text-foreground">
                You must first verify email to proceed.
              </span>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-niko-muted hover:text-foreground p-1 transition-colors cursor-pointer outline-none rounded-md"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {modalEmailError && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {modalEmailError}
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleModalEmailSubmit} className="space-y-4">
                <div>
                  <input
                    id="modal-email"
                    type="email"
                    required
                    value={modalEmail}
                    onChange={(e) => setModalEmail(e.target.value)}
                    className="block w-full rounded-md border border-niko-border bg-background px-4 py-3 text-foreground shadow-sm focus:border-niko-teal/50 outline-none text-sm"
                    placeholder="Enter email address"
                  />
                </div>
                <button
                  type="submit"
                  disabled={modalEmailLoading}
                  className="w-full py-3 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all flex justify-center items-center text-xs cursor-pointer"
                >
                  {modalEmailLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-niko-navy border-t-transparent" />
                  ) : (
                    "Send Verification Code"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleModalOtpSubmit} className="space-y-4">
                <p className="text-xs text-niko-muted text-center">
                  Code sent to {modalEmail}. (Type any 6 digits to verify).
                </p>
                <div>
                  <input
                    id="modal-otp"
                    type="text"
                    maxLength={6}
                    required
                    value={modalOtp}
                    onChange={(e) =>
                      setModalOtp(e.target.value.replace(/\D/g, ""))
                    }
                    className="block w-full rounded-md border border-niko-border bg-background px-4 py-3 text-center text-lg font-bold tracking-[0.2em] text-foreground focus:border-niko-teal/50 outline-none font-mono"
                    placeholder="000000"
                  />
                </div>
                <button
                  type="submit"
                  disabled={modalEmailLoading}
                  className="w-full py-3 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all flex justify-center items-center text-xs cursor-pointer"
                >
                  {modalEmailLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-niko-navy border-t-transparent" />
                  ) : (
                    "Verify & Proceed"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* WALLET CONNECTION GATE MODAL */}
      {showConnectGateModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/20 p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-xl p-6 space-y-4 shadow-2xl relative z-55 animate-fade-in">
            <div className="flex items-center justify-between border-b border-niko-border/60 pb-3">
              <span className="text-base text-foreground">
                You must first connect wallet to proceed.
              </span>
              <button
                type="button"
                onClick={() => setShowConnectGateModal(false)}
                className="text-niko-muted hover:text-foreground p-1 transition-colors cursor-pointer outline-none rounded-md"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {gateWalletState === "idle" && (
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => handleGateWalletConnect("MetaMask")}
                  className="flex w-full items-center justify-between rounded-md border border-niko-border bg-background px-4 py-3 text-xs font-sans text-foreground hover:border-niko-teal/40 hover:bg-niko-surface transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Image
                      src="/logos/metamask-logo.png"
                      alt="MetaMask"
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain"
                    />
                    MetaMask
                  </span>
                  <span className="text-[10px] text-niko-teal">Popular</span>
                </button>

                <button
                  onClick={() => handleGateWalletConnect("Coinbase Wallet")}
                  className="flex w-full items-center justify-between rounded-md border border-niko-border bg-background px-4 py-3 text-xs font-sans text-foreground hover:border-niko-teal/40 hover:bg-niko-surface transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Image
                      src="/logos/coinbase-logo.webp"
                      alt="Coinbase"
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain rounded-md"
                    />
                    Coinbase Wallet
                  </span>
                </button>

                <button
                  onClick={() => handleGateWalletConnect("WalletConnect")}
                  className="flex w-full items-center justify-between rounded-md border border-niko-border bg-background px-4 py-3 text-xs font-sans text-foreground hover:border-niko-teal/40 hover:bg-niko-surface transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Image
                      src="/logos/walletconnect-logo.png"
                      alt="WalletConnect"
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain"
                    />
                    WalletConnect
                  </span>
                </button>
              </div>
            )}

            {gateWalletState !== "idle" && (
              <div className="flex flex-col items-center justify-center py-4 bg-background/50 rounded-md border border-niko-border/60">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-niko-teal border-t-transparent mb-2" />
                <p className="text-xs font-sans text-foreground">
                  Connecting to {gateSelectedWallet}...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
