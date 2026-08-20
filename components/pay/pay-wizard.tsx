"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLiveQuote } from "@/components/pay/use-live-quote";
import { useWalletSession } from "@/components/pay/use-wallet-session";
import { getPublicChain } from "@/lib/chain-config";
import { normalizeMsisdn, normalizeOptionalEmail } from "@/lib/identity";
import { createLiveIntent, reportIntentDepositWhenReady } from "@/lib/pay-api";
import { readLocal } from "@/lib/read-local";
import type { ChainId, PaymentIntent } from "@/lib/settlement/types";
import { formatRwf, formatUsdt } from "@/lib/rates";
import type { WalletKind } from "@/lib/wallet/browser";
import { connectInjectedWallet, consentAndTransferUsdt } from "@/lib/wallet/offramp";
import { sameWalletAddress, shortAddress } from "@/lib/wallet-session";

type Step = 1 | 2 | 3 | 4;

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

function asWalletKind(name: string): WalletKind {
  if (name === "Coinbase Wallet" || name === "WalletConnect") {
    return name;
  }
  return "MetaMask";
}

export function PayWizard() {
  const router = useRouter();
  const {
    walletConnected,
    walletAddress,
    walletName,
    accountEpoch,
    connect,
    disconnect,
    syncFromProvider,
  } = useWalletSession();

  const [step, setStep] = useState<Step>(1);
  const [chain, setChain] = useState<ChainId>("base");
  const [amount, setAmount] = useState<string>("");
  const [msisdn, setMsisdn] = useState<string>("");
  const [formattedMsisdn, setFormattedMsisdn] = useState<string>("");
  const [notifyEmail, setNotifyEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [rate] = useState(() =>
    parseFloat(readLocal("nikopay_fx_rate", "1350")),
  );
  const [feePercent] = useState(() =>
    parseFloat(readLocal("nikopay_fx_fee", "1.5")),
  );
  const rwfPayout = parseFloat(amount) || 0;
  const {
    quote,
    fx,
    status: quoteStatus,
    error: quoteError,
  } = useLiveQuote(rwfPayout, chain);

  const [connecting, setConnecting] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [modalState, setModalState] = useState<
    "confirm" | "submitting" | "broadcasting"
  >("confirm");
  const [liveIntent, setLiveIntent] = useState<PaymentIntent | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [intentError, setIntentError] = useState("");
  const [amountError, setAmountError] = useState<string>("");
  const [msisdnError, setMsisdnError] = useState<string>("");
  const [showConnectGateModal, setShowConnectGateModal] =
    useState<boolean>(false);
  const [gateWalletState, setGateWalletState] = useState<
    "idle" | "connecting" | "success"
  >("idle");
  const [gateSelectedWallet, setGateSelectedWallet] = useState<WalletKind | null>(
    null,
  );
  const [gateError, setGateError] = useState("");
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (accountEpoch === 0) {
      return;
    }
    setLiveIntent(null);
    setShowWalletModal(false);
    setPayError("");
    setIntentError(
      "Wallet account changed. Confirm again to create a payment for this wallet.",
    );
  }, [accountEpoch]);

  const handleGateWalletConnect = async (kind: WalletKind) => {
    setGateSelectedWallet(kind);
    setGateError("");
    setGateWalletState("connecting");

    const result = await connectInjectedWallet(kind, chain);
    if (!result.ok) {
      setGateWalletState("idle");
      setGateError(result.reason);
      return;
    }

    connect(result.address, result.walletName);
    setLiveIntent(null);
    setGateWalletState("success");
    setShowConnectGateModal(false);
    setStep(2);
  };

  const displayRate = quote?.rate ?? fx?.rate ?? rate;
  const displayFeePercent = quote?.feePercent ?? fx?.feePercent ?? feePercent;
  const estimatedUsdt = rwfPayout / (displayRate * (1 - displayFeePercent / 100));
  const amountQuoteReady = rwfPayout > 0 && quoteStatus === "ready" && quote != null;
  const usdtAmount = amountQuoteReady ? quote.usdtAmount : estimatedUsdt;
  const feeRwf = amountQuoteReady
    ? quote.feeRwf
    : estimatedUsdt * displayRate - rwfPayout;
  const netRwf = amountQuoteReady ? quote.netRwf : rwfPayout;
  const chainConfig = getPublicChain(chain);
  const chainPayReady = chainConfig.tokenReady;
  const continueLabel = chainPayReady
    ? "Continue to Details"
    : `${chainConfig.name} deposits not enabled yet`;
  const treasuryAddress = liveIntent?.treasuryAddress ?? "";

  const validateAmount = () => {
    if (!amount || isNaN(rwfPayout) || rwfPayout <= 0) {
      setAmountError("Please enter a valid payout amount");
      return false;
    }
    setAmountError("");
    return true;
  };

  const validateMsisdn = () => {
    if (!msisdn.trim()) {
      setMsisdnError("Mobile Money number is required");
      return false;
    }
    const parsed = normalizeMsisdn(msisdn);
    if (!parsed.ok) {
      setMsisdnError(
        "Enter a valid mobile number (e.g. 078XXXXXXX or +46733123450)",
      );
      return false;
    }
    setMsisdnError("");
    return true;
  };

  const validateEmail = () => {
    const parsed = normalizeOptionalEmail(notifyEmail);
    if (!parsed.ok) {
      setEmailError(parsed.reason);
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleMsisdnChange = (value: string) => {
    setMsisdn(value);
    const parsed = normalizeMsisdn(value);
    if (parsed.ok) {
      const digits = parsed.msisdn;
      if (digits.startsWith("250") && digits.length === 12) {
        setFormattedMsisdn(
          `+250 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`,
        );
      } else {
        setFormattedMsisdn(`+${digits}`);
      }
      return;
    }
    setFormattedMsisdn(value.trim());
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!validateAmount()) {
        return;
      }
      if (!amountQuoteReady) {
        setAmountError(quoteError || "Waiting for a live quote");
        return;
      }
      setLiveIntent(null);
      setIntentError("");
      if (!walletConnected) {
        setShowConnectGateModal(true);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (validateMsisdn() && validateEmail()) {
        setLiveIntent(null);
        setIntentError("");
        setStep(3);
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setLiveIntent(null);
      setIntentError("");
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleConnectWallet = async () => {
    setConnecting(true);
    setIntentError("");
    const result = await connectInjectedWallet("MetaMask", chain);
    setConnecting(false);
    if (!result.ok) {
      setIntentError(result.reason);
      return;
    }

    connect(result.address, result.walletName);
    setLiveIntent(null);
  };

  const handleDisconnectWallet = () => {
    disconnect();
    setLiveIntent(null);
    setShowWalletModal(false);
    setIntentError("");
    setPayError("");
  };

  const intentMatchesQuote = (intent: PaymentIntent, active: string) => {
    const parsedMsisdn = normalizeMsisdn(msisdn);
    const parsedEmail = normalizeOptionalEmail(notifyEmail);
    if (!quote || !parsedMsisdn.ok || !parsedEmail.ok) {
      return false;
    }
    const intentEmail = intent.notifyEmail ?? null;
    return (
      intent.usdtAmount === quote.usdtAmount &&
      intent.chain === chain &&
      sameWalletAddress(intent.walletAddress, active) &&
      intent.msisdn === parsedMsisdn.msisdn &&
      intentEmail === parsedEmail.email
    );
  };

  const handleConfirmTransfer = async () => {
    if (!walletConnected || creatingIntent) {
      return;
    }
    setIntentError("");

    if (!quote || !amountQuoteReady) {
      setIntentError(quoteError || "Waiting for a live quote");
      return;
    }

    if (!chainPayReady) {
      setIntentError(`${chainConfig.name} test USDT is not configured yet`);
      return;
    }

    const parsedMsisdn = normalizeMsisdn(msisdn);
    if (!parsedMsisdn.ok) {
      setIntentError(parsedMsisdn.reason);
      return;
    }

    const parsedEmail = normalizeOptionalEmail(notifyEmail);
    if (!parsedEmail.ok) {
      setIntentError(parsedEmail.reason);
      return;
    }

    const activeAddress = await syncFromProvider();
    if (!activeAddress) {
      setIntentError("Wallet disconnected. Connect again to continue.");
      return;
    }

    if (liveIntent && intentMatchesQuote(liveIntent, activeAddress)) {
      setShowWalletModal(true);
      setModalState("confirm");
      return;
    }

    setCreatingIntent(true);
    const result = await createLiveIntent({
      usdtAmount: quote.usdtAmount,
      chain,
      msisdn: parsedMsisdn.msisdn,
      walletAddress: activeAddress,
      notifyEmail: parsedEmail.email ?? undefined,
    });
    setCreatingIntent(false);

    if (!result.ok) {
      setIntentError(result.reason);
      return;
    }

    setLiveIntent(result.data);
    setShowWalletModal(true);
    setModalState("confirm");
  };

  const handleModalConfirm = async () => {
    if (!liveIntent) {
      setIntentError("Payment intent is missing. Try confirming again.");
      setShowWalletModal(false);
      return;
    }

    setPayError("");
    setModalState("submitting");

    const activeAddress = await syncFromProvider();
    if (!sameWalletAddress(activeAddress, liveIntent.walletAddress)) {
      setLiveIntent(null);
      setPayError(
        "Active wallet account changed. Confirm again to create a payment for this wallet.",
      );
      setModalState("confirm");
      setShowWalletModal(false);
      return;
    }

    const result = await consentAndTransferUsdt({
      intent: liveIntent,
      walletName: asWalletKind(walletName),
    });

    if (!result.ok) {
      if (result.reason.includes("account changed")) {
        setLiveIntent(null);
        setShowWalletModal(false);
        setIntentError(result.reason);
      }
      setPayError(result.reason);
      setModalState("confirm");
      return;
    }

    setModalState("broadcasting");
    const intentId = liveIntent.id;
    await reportIntentDepositWhenReady(intentId, result.txHash);
    setShowWalletModal(false);
    router.push(`/app/payments/${intentId}`);
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
                {!getPublicChain("polygon").tokenReady && (
                  <span className="mt-1 text-[10px] text-niko-muted">
                    Test token not live yet
                  </span>
                )}
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
            {quoteError && !amountError && (
              <p className="mt-2 text-xs text-red-400">{quoteError}</p>
            )}
            <p className="mt-2 text-xs text-niko-muted flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-niko-teal" />
              1 USDT = {displayRate.toLocaleString()} RWF
              {quote ? " (live rate)" : " (loading rate)"}
              {quoteStatus === "loading" && rwfPayout > 0 ? " · updating" : ""}
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
                Service Fee ({displayFeePercent}%)
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
            disabled={!amountQuoteReady || !chainPayReady}
            className="w-full py-4 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
                {quoteStatus === "loading" && rwfPayout > 0
                  ? "Fetching live quote..."
                  : continueLabel}
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
              Rwanda MTN numbers (078…) or international E.164 for sandbox
              testing (e.g. +46733123450).
            </p>
            <div className="relative mt-3 flex items-center rounded-md border border-niko-border bg-background px-4 py-3.5 focus-within:border-niko-teal/50 transition-colors">
              <input
                id="msisdn-input"
                type="text"
                inputMode="tel"
                value={msisdn}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[+\d\s-]*$/.test(val)) {
                    handleMsisdnChange(val);
                    if (msisdnError) setMsisdnError("");
                  }
                }}
                onBlur={validateMsisdn}
                className="w-full bg-transparent font-mono text-lg font-semibold text-foreground outline-none placeholder:text-niko-muted/40"
                placeholder="e.g. 0787259588 or +46733123450"
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

          <div>
            <label
              htmlFor="notify-email-input"
              className="text-sm font-medium text-foreground"
            >
              Email for payout confirmation{" "}
              <span className="text-niko-muted font-normal">(optional)</span>
            </label>
            <p className="text-xs text-niko-muted mt-1">
              We email you immediately when MTN confirms the MoMo payout. No
              account required.
            </p>
            <div className="relative mt-3 flex items-center rounded-md border border-niko-border bg-background px-4 py-3.5 focus-within:border-niko-teal/50 transition-colors">
              <input
                id="notify-email-input"
                type="email"
                autoComplete="email"
                value={notifyEmail}
                onChange={(e) => {
                  setNotifyEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onBlur={validateEmail}
                className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-niko-muted/40"
                placeholder="you@example.com"
              />
            </div>
            {emailError && (
              <p className="mt-2 text-xs text-red-400">{emailError}</p>
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

      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-md border border-niko-border bg-background p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-niko-border/60 pb-3">
              <h3 className="text-sm font-semibold text-niko-teal uppercase tracking-wider">
                Transaction Details
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`h-2 w-2 rounded-full ${walletConnected ? "bg-niko-teal animate-pulse-glow" : "bg-red-500 animate-pulse"}`}
                  />
                  <span className="text-xs text-niko-muted font-medium">
                    {walletConnected
                      ? "Wallet Connected"
                      : "Wallet Disconnected"}
                  </span>
                </div>
                {walletConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnectWallet}
                    className="text-xs font-semibold text-niko-muted hover:text-foreground underline-offset-2 hover:underline"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div className="text-niko-muted">Destination Chain</div>
              <div className="font-semibold text-right capitalize">{chain}</div>

              {walletConnected && (
                <>
                  <div className="text-niko-muted">Connected Wallet</div>
                  <div className="font-mono font-semibold text-right text-niko-teal-bright">
                    {shortAddress(walletAddress)}
                  </div>
                </>
              )}

              <div className="text-niko-muted">Recipient Receives</div>
              <div className="font-semibold text-right text-foreground font-mono">
                {formatRwf(netRwf)}
              </div>

              <div className="text-niko-muted">Exchange Rate</div>
              <div className="text-right font-mono text-foreground">
                1 USDT = {displayRate.toLocaleString()} RWF
              </div>

              <div className="text-niko-muted">
                Processing Fee ({displayFeePercent}%)
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

              {notifyEmail.trim() && (
                <>
                  <div className="text-niko-muted">Payout email</div>
                  <div className="font-semibold text-right text-foreground break-all">
                    {notifyEmail.trim()}
                  </div>
                </>
              )}

              {treasuryAddress && (
                <>
                  <div className="text-niko-muted">Treasury address</div>
                  <div
                    className="font-mono font-semibold text-right text-niko-teal-bright break-all"
                    title={treasuryAddress}
                  >
                    {shortAddress(treasuryAddress)}
                  </div>
                </>
              )}
            </div>
          </div>

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
                onClick={() => void handleConnectWallet()}
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

          {intentError && <p className="text-xs text-red-400">{intentError}</p>}

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
              disabled={!walletConnected || creatingIntent || !amountQuoteReady}
              onClick={handleConfirmTransfer}
              className={`w-2/3 py-4 font-bold rounded-md transition-all flex justify-center items-center gap-2 text-sm ${
                walletConnected && !creatingIntent && amountQuoteReady
                  ? "bg-niko-teal hover:bg-niko-teal-bright text-niko-navy cursor-pointer"
                  : "bg-niko-surface border border-niko-border text-niko-muted opacity-50 cursor-not-allowed"
              }`}
            >
              {creatingIntent ? "Creating payment..." : "Confirm & Transfer"}
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

      {showWalletModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/20 p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-xl p-6 space-y-6 shadow-2xl relative z-55 animate-fade-in">
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

            {modalState === "confirm" ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs text-niko-muted uppercase tracking-wider">
                    Two-step wallet approval
                  </h4>
                  <p className="mt-1.5 text-xs text-foreground leading-relaxed">
                    First you sign an offramp consent that shows the USDT amount,
                    treasury, and MoMo recipient. Then your wallet sends USDT to
                    the NikoPay treasury. RWF is paid after the deposit is
                    confirmed on {chainConfig.name}.
                  </p>
                </div>

                <div className="rounded-md border border-niko-border bg-background p-4 space-y-2.5">
                  <div className="flex justify-between text-xs text-niko-muted">
                    <span>From (Your Wallet)</span>
                    <span className="font-mono text-foreground">
                      {shortAddress(walletAddress)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-niko-muted">
                    <span>To (NikoPay Vault)</span>
                    <span
                      className="font-mono text-foreground"
                      title={treasuryAddress || undefined}
                    >
                      {treasuryAddress
                        ? shortAddress(treasuryAddress)
                        : "assigned on confirm"}
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
                    <span>Network</span>
                    <span className="font-mono text-foreground">
                      {chainConfig.name}
                    </span>
                  </div>
                  {liveIntent && (
                    <div className="flex justify-between text-xs text-niko-muted mt-1">
                      <span>MoMo recipient</span>
                      <span className="font-mono text-foreground">
                        {liveIntent.msisdn}
                      </span>
                    </div>
                  )}
                </div>

                {payError && (
                  <p className="text-xs text-red-400">{payError}</p>
                )}

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
                    onClick={() => void handleModalConfirm()}
                    disabled={modalState !== "confirm"}
                    className="w-1/2 py-2.5 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md text-xs transition-all"
                  >
                    Sign + send USDT
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-niko-teal border-t-transparent" />
                <div className="text-center">
                  <p className="text-sm text-foreground">
                    {modalState === "submitting"
                      ? `Awaiting ${walletName} consent signature...`
                      : "Sending USDT to treasury..."}
                  </p>
                  <p className="text-xs text-niko-muted mt-1 max-w-[220px] mx-auto">
                    Approve each prompt in {walletName}. The first signature
                    does not move funds.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

            {gateError && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {gateError}
              </div>
            )}

            {gateWalletState === "idle" && (
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => void handleGateWalletConnect("MetaMask")}
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
                  type="button"
                  onClick={() => void handleGateWalletConnect("Coinbase Wallet")}
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
                  type="button"
                  onClick={() => void handleGateWalletConnect("WalletConnect")}
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
