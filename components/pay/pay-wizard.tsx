"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  useLiveQuote,
  type AmountEntry,
} from "@/components/pay/use-live-quote";
import { useWalletSession } from "@/components/pay/use-wallet-session";
import { WalletPicker } from "@/components/shared/wallet-picker";
import { RecipientNamePreviewCard } from "@/components/pay/recipient-name-preview";
import { getPublicChain } from "@/lib/chain-config";
import {
  composeMsisdnDigits,
  formatMsisdnDisplay,
  matchLongestDialPrefix,
  nationalNumberDigits,
  normalizeMsisdn,
  normalizeOptionalEmail,
} from "@/lib/identity";
import {
  createLiveIntent,
  fetchCorridorCountries,
  fetchCorridorProviders,
  fetchRecipientNamePreview,
  predictCorridorProvider,
  reportIntentDepositWhenReady,
  type CorridorCountryOption,
  type CorridorProviderOption,
} from "@/lib/pay-api";
import type { ChainId, PaymentIntent } from "@/lib/settlement/types";
import {
  netLocalForUsdt,
  usdtForTargetLocal,
  feeUsdtForAmount,
} from "@/lib/settlement/quote";
import { formatLocalAmount, formatUsdt } from "@/lib/rates";
import { asWalletKind, type WalletKind } from "@/lib/wallet/browser";
import {
  connectInjectedWallet,
  consentAndTransferUsdt,
} from "@/lib/wallet/offramp";
import { sameWalletAddress, shortAddress } from "@/lib/wallet-session";

type Step = 1 | 2 | 3 | 4;

const FALLBACK_CORRIDOR_COUNTRY = "RWA";

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

function formatUsdtInput(value: number): string {
  const fixed = value.toFixed(6);
  return fixed.replace(/\.?0+$/, "");
}

export function PayWizard() {
  const router = useRouter();
  const {
    walletConnected,
    walletAddress,
    walletName,
    connect,
    disconnect,
    syncFromProvider,
  } = useWalletSession();

  const [step, setStep] = useState<Step>(1);
  const [chain, setChain] = useState<ChainId>("base");
  const [amountEntry, setAmountEntry] = useState<AmountEntry>("local");
  const [amountRwf, setAmountRwf] = useState<string>("");
  const [amountUsdt, setAmountUsdt] = useState<string>("");
  const [msisdn, setMsisdn] = useState<string>("");
  const [formattedMsisdn, setFormattedMsisdn] = useState<string>("");
  const [verifiedMsisdn, setVerifiedMsisdn] = useState<string>("");
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [recipientNameStatus, setRecipientNameStatus] = useState<
    "idle" | "loading" | "found" | "not_found" | "unavailable"
  >("idle");
  const [corridorCountries, setCorridorCountries] = useState<
    CorridorCountryOption[]
  >([]);
  const [corridorCountry, setCorridorCountry] = useState(
    FALLBACK_CORRIDOR_COUNTRY,
  );
  const [corridorCurrency, setCorridorCurrency] = useState("RWF");
  const [corridorProvider, setCorridorProvider] = useState("");
  const [corridorProviders, setCorridorProviders] = useState<
    CorridorProviderOption[]
  >([]);
  const [corridorError, setCorridorError] = useState("");
  const [corridorLoading, setCorridorLoading] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const rwfPayout = parseFloat(amountRwf) || 0;
  const usdtSell = parseFloat(amountUsdt) || 0;
  const {
    quote,
    fx,
    status: quoteStatus,
    error: quoteError,
  } = useLiveQuote({
    chain,
    currency: corridorCurrency,
    entry: amountEntry,
    localPayout: rwfPayout,
    usdtSell,
  });

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
  const [gateSelectedWallet, setGateSelectedWallet] =
    useState<WalletKind | null>(null);
  const [gateError, setGateError] = useState("");
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (step !== 2) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      setCorridorLoading(true);
      setCorridorError("");

      const countriesResult = await fetchCorridorCountries();
      if (cancelled) {
        return;
      }
      if (!countriesResult.ok) {
        setCorridorLoading(false);
        setCorridorError(countriesResult.reason);
        return;
      }

      const countries = countriesResult.data.countries;
      setCorridorCountries(countries);

      const preferred =
        countries.find((row) => row.country === corridorCountry) ??
        countries.find((row) => row.country === FALLBACK_CORRIDOR_COUNTRY) ??
        countries[0];
      if (!preferred) {
        setCorridorLoading(false);
        setCorridorError("no payout countries configured");
        return;
      }

      const providersResult = await fetchCorridorProviders(preferred.country);
      if (cancelled) {
        return;
      }
      setCorridorLoading(false);
      if (!providersResult.ok) {
        setCorridorError(providersResult.reason);
        return;
      }

      setCorridorCountry(providersResult.data.country);
      setCorridorProviders(providersResult.data.providers);
      const keepCurrent = providersResult.data.providers.some(
        (row) => row.provider === corridorProvider,
      );
      const nextProvider = keepCurrent
        ? corridorProvider
        : (providersResult.data.providers[0]?.provider ?? "");
      const selected =
        providersResult.data.providers.find(
          (row) => row.provider === nextProvider,
        ) ?? null;
      setCorridorProvider(nextProvider);
      if (selected) {
        setCorridorCurrency(selected.currency);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when entering step 2
  }, [step]);

  const selectedCountry =
    corridorCountries.find((row) => row.country === corridorCountry) ?? null;
  const dialPrefix = selectedCountry?.prefix ?? "";
  const knownPrefixes = corridorCountries.map((row) => row.prefix);

  const selectedCorridor =
    corridorProviders.find((row) => row.provider === corridorProvider) ?? null;

  const clearRecipientName = () => {
    setRecipientName(null);
    setRecipientNameStatus("idle");
  };

  const loadRecipientName = async (input: {
    msisdn: string;
    country: string;
    provider: string;
  }) => {
    setRecipientNameStatus("loading");
    setRecipientName(null);
    const result = await fetchRecipientNamePreview(input);
    if (!result.ok) {
      setRecipientNameStatus("unavailable");
      return;
    }
    setRecipientName(result.data.displayName);
    setRecipientNameStatus(result.data.status);
  };

  const walletDrifted =
    Boolean(liveIntent) &&
    Boolean(walletAddress) &&
    !sameWalletAddress(liveIntent?.walletAddress, walletAddress);

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

  const displayCurrency =
    (quote?.currency ?? fx?.currency ?? corridorCurrency) || "RWF";
  const formatPayout = (amount: number) =>
    formatLocalAmount(amount, displayCurrency);

  const displayRate = quote?.rate ?? fx?.rate;
  const displayFeePercent = quote?.feePercent ?? fx?.feePercent;
  const hasAmount = amountEntry === "local" ? rwfPayout > 0 : usdtSell > 0;
  const hasLiveRate =
    displayRate != null &&
    Number.isFinite(displayRate) &&
    displayFeePercent != null &&
    Number.isFinite(displayFeePercent);
  const estimatedUsdt =
    amountEntry === "usdt"
      ? usdtSell
      : hasLiveRate
        ? rwfPayout / (displayRate * (1 - displayFeePercent / 100))
        : 0;
  const estimatedNetRwf =
    amountEntry === "local"
      ? rwfPayout
      : hasLiveRate
        ? usdtSell * displayRate * (1 - displayFeePercent / 100)
        : 0;
  const amountQuoteReady =
    hasAmount && quoteStatus === "ready" && quote != null;
  const usdtAmount = amountQuoteReady ? quote.usdtAmount : estimatedUsdt;
  const feeRwf = amountQuoteReady
    ? quote.feeRwf
    : hasLiveRate
      ? estimatedUsdt * displayRate - estimatedNetRwf
      : 0;
  const netRwf = amountQuoteReady ? quote.netRwf : estimatedNetRwf;
  const chainConfig = getPublicChain(chain);
  const chainPayReady = chainConfig.tokenReady;
  const continueLabel = chainPayReady
    ? "Continue to Details"
    : `${chainConfig.name} deposits not enabled yet`;
  const treasuryAddress = liveIntent?.treasuryAddress ?? "";

  const previewRate = fx?.rate ?? displayRate;
  const previewFee = fx?.feePercent ?? displayFeePercent;

  const handleRwfChange = (value: string) => {
    if (!/^\d*$/.test(value)) {
      return;
    }
    setAmountEntry("local");
    setAmountRwf(value);
    if (amountError) setAmountError("");

    const parsed = parseFloat(value);
    if (!value || !Number.isFinite(parsed) || parsed <= 0) {
      setAmountUsdt("");
      return;
    }
    if (previewRate == null || previewFee == null) {
      setAmountUsdt("");
      return;
    }
    const usdt = usdtForTargetLocal(parsed, previewRate, previewFee);
    setAmountUsdt(usdt != null ? formatUsdtInput(usdt) : "");
  };

  const handleUsdtChange = (value: string) => {
    if (!/^\d*\.?\d{0,6}$/.test(value)) {
      return;
    }
    setAmountEntry("usdt");
    setAmountUsdt(value);
    if (amountError) setAmountError("");

    const parsed = parseFloat(value);
    if (!value || !Number.isFinite(parsed) || parsed <= 0) {
      setAmountRwf("");
      return;
    }
    if (previewRate == null || previewFee == null) {
      setAmountRwf("");
      return;
    }
    const local = netLocalForUsdt(parsed, previewRate, previewFee);
    setAmountRwf(local != null ? String(Math.round(local)) : "");
  };

  const validateAmount = () => {
    if (amountEntry === "local") {
      if (!amountRwf || isNaN(rwfPayout) || rwfPayout <= 0) {
        setAmountError(`Enter a valid ${corridorCurrency} payout amount`);
        return false;
      }
    } else if (!amountUsdt || isNaN(usdtSell) || usdtSell <= 0) {
      setAmountError("Enter a valid USDT amount to sell");
      return false;
    }
    setAmountError("");
    return true;
  };

  const resolveMsisdn = () => {
    if (!msisdn.trim()) {
      return { ok: false as const, reason: "Mobile Money number is required" };
    }
    if (!dialPrefix) {
      return {
        ok: false as const,
        reason: "Select a destination country first",
      };
    }
    const composed = composeMsisdnDigits(msisdn, dialPrefix, knownPrefixes);
    const parsed = normalizeMsisdn(composed);
    if (!parsed.ok) {
      return {
        ok: false as const,
        reason: "Enter a valid mobile number for the selected country",
      };
    }
    if (!verifiedMsisdn || verifiedMsisdn !== parsed.msisdn) {
      return {
        ok: false as const,
        reason: "Confirm the number so we can validate country and provider",
      };
    }
    return { ok: true as const, msisdn: verifiedMsisdn };
  };

  const validateCorridor = () => {
    if (!corridorProvider || !corridorCurrency || !corridorCountry) {
      setCorridorError("Select a mobile money provider");
      return false;
    }
    if (selectedCorridor?.payoutStatus === "CLOSED") {
      setCorridorError(
        "This provider is closed right now. Try another provider or come back later.",
      );
      return false;
    }
    if (selectedCorridor?.rateConfigured === false) {
      setCorridorError(
        `No live NikoPay rate for ${selectedCorridor.currency} yet. Pick another corridor or try again later.`,
      );
      return false;
    }
    if (selectedCorridor && quote && Number.isFinite(quote.netRwf)) {
      const min = Number(selectedCorridor.minAmount);
      const max = Number(selectedCorridor.maxAmount);
      if (Number.isFinite(min) && quote.netRwf < min) {
        setCorridorError(
          `Payout is below the provider minimum (${selectedCorridor.minAmount} ${selectedCorridor.currency})`,
        );
        return false;
      }
      if (Number.isFinite(max) && quote.netRwf > max) {
        setCorridorError(
          `Payout exceeds the provider maximum (${selectedCorridor.maxAmount} ${selectedCorridor.currency})`,
        );
        return false;
      }
    }
    setCorridorError("");
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

  const loadProvidersForCountry = async (
    country: string,
    preferredProvider?: string,
  ) => {
    setCorridorLoading(true);
    setCorridorError("");
    const result = await fetchCorridorProviders(country);
    setCorridorLoading(false);
    if (!result.ok) {
      setCorridorError(result.reason);
      return null;
    }

    setCorridorCountry(result.data.country);
    setCorridorProviders(result.data.providers);
    const nextProvider =
      (preferredProvider &&
        result.data.providers.find((row) => row.provider === preferredProvider)
          ?.provider) ||
      result.data.providers[0]?.provider ||
      "";
    const selected =
      result.data.providers.find((row) => row.provider === nextProvider) ??
      null;
    setCorridorProvider(nextProvider);
    if (selected) {
      setCorridorCurrency(selected.currency);
    }
    return result.data;
  };

  const applyPredictedProvider = async (
    phone: string,
  ): Promise<string | null> => {
    const predicted = await predictCorridorProvider(phone);
    if (!predicted.ok) {
      setVerifiedMsisdn("");
      setFormattedMsisdn("");
      clearRecipientName();
      setMsisdnError(
        predicted.reason ||
          "This number is not valid for mobile money in a supported country",
      );
      return null;
    }

    const match = corridorCountries.find(
      (row) => row.country === predicted.data.country,
    );
    const displayPrefix = match?.prefix ?? dialPrefix;
    setVerifiedMsisdn(predicted.data.phoneNumber);
    setMsisdn(nationalNumberDigits(predicted.data.phoneNumber, displayPrefix));
    setFormattedMsisdn(
      formatMsisdnDisplay(predicted.data.phoneNumber, displayPrefix),
    );
    setMsisdnError("");

    if (predicted.data.country !== corridorCountry) {
      await loadProvidersForCountry(
        predicted.data.country,
        predicted.data.provider,
      );
    } else {
      setCorridorProvider(predicted.data.provider);
      setCorridorCurrency(predicted.data.currency);
      setCorridorProviders((prev) => {
        if (prev.some((row) => row.provider === predicted.data.provider)) {
          return prev;
        }
        return [
          ...prev,
          {
            country: predicted.data.country,
            provider: predicted.data.provider,
            displayName: predicted.data.provider,
            currency: predicted.data.currency,
            decimalsInAmount: predicted.data.decimalsInAmount,
            minAmount: predicted.data.minAmount,
            maxAmount: predicted.data.maxAmount,
            rateConfigured: predicted.data.rateConfigured,
          },
        ];
      });
    }
    void loadRecipientName({
      msisdn: predicted.data.phoneNumber,
      country: predicted.data.country,
      provider: predicted.data.provider,
    });
    return predicted.data.phoneNumber;
  };

  const handleCountryChange = (country: string) => {
    setCorridorError("");
    setVerifiedMsisdn("");
    setFormattedMsisdn("");
    clearRecipientName();
    void (async () => {
      const loaded = await loadProvidersForCountry(country);
      if (!loaded) {
        return;
      }
      const next = corridorCountries.find((row) => row.country === country);
      if (!next || !msisdn.trim()) {
        return;
      }
      const national = nationalNumberDigits(msisdn, next.prefix);
      setMsisdn(national);
      const composed = composeMsisdnDigits(
        national,
        next.prefix,
        knownPrefixes,
      );
      const parsed = normalizeMsisdn(composed);
      if (!parsed.ok) {
        return;
      }
      await applyPredictedProvider(parsed.msisdn);
    })();
  };

  const handleMsisdnChange = (value: string) => {
    setVerifiedMsisdn("");
    setFormattedMsisdn("");
    clearRecipientName();
    if (msisdnError) setMsisdnError("");

    const matchedPrefix = matchLongestDialPrefix(value, knownPrefixes);
    if (matchedPrefix) {
      const matchedCountry = corridorCountries.find(
        (row) => row.prefix === matchedPrefix,
      );
      const national = nationalNumberDigits(value, matchedPrefix);
      setMsisdn(national);
      if (matchedCountry && matchedCountry.country !== corridorCountry) {
        void loadProvidersForCountry(matchedCountry.country);
      }
      return;
    }

    setMsisdn(value);
  };

  const handleMsisdnBlur = () => {
    if (!msisdn.trim()) {
      setMsisdnError("Mobile Money number is required");
      return;
    }
    if (!dialPrefix) {
      setMsisdnError("Select a destination country first");
      return;
    }
    const composed = composeMsisdnDigits(msisdn, dialPrefix, knownPrefixes);
    const parsed = normalizeMsisdn(composed);
    if (!parsed.ok) {
      setVerifiedMsisdn("");
      setFormattedMsisdn("");
      clearRecipientName();
      setMsisdnError("Enter a valid mobile number for the selected country");
      return;
    }
    void applyPredictedProvider(parsed.msisdn);
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
      void (async () => {
        if (!msisdn.trim()) {
          setMsisdnError("Mobile Money number is required");
          return;
        }
        if (!dialPrefix) {
          setMsisdnError("Select a destination country first");
          return;
        }
        const composed = composeMsisdnDigits(msisdn, dialPrefix, knownPrefixes);
        const parsed = normalizeMsisdn(composed);
        if (!parsed.ok) {
          setMsisdnError(
            "Enter a valid mobile number for the selected country",
          );
          return;
        }
        if (verifiedMsisdn !== parsed.msisdn) {
          const phone = await applyPredictedProvider(parsed.msisdn);
          if (!phone) {
            return;
          }
        }
        if (!amountQuoteReady) {
          setCorridorError(
            quoteError || "Waiting for a live NikoPay rate for this corridor",
          );
          return;
        }
        if (validateCorridor() && validateEmail()) {
          setMsisdnError("");
          setLiveIntent(null);
          setIntentError("");
          setStep(3);
        }
      })();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setLiveIntent(null);
      setIntentError("");
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleConnectWallet = () => {
    setGateError("");
    setGateWalletState("idle");
    setGateSelectedWallet(null);
    setShowConnectGateModal(true);
  };

  const handleDisconnectWallet = () => {
    disconnect();
    setLiveIntent(null);
    setShowWalletModal(false);
    setIntentError("");
    setPayError("");
  };

  const intentMatchesQuote = (intent: PaymentIntent, active: string) => {
    const resolved = resolveMsisdn();
    const parsedEmail = normalizeOptionalEmail(notifyEmail);
    if (!quote || !resolved.ok || !parsedEmail.ok) {
      return false;
    }
    const intentEmail = intent.notifyEmail ?? null;
    return (
      intent.usdtAmount === quote.usdtAmount &&
      intent.chain === chain &&
      sameWalletAddress(intent.walletAddress, active) &&
      intent.msisdn === resolved.msisdn &&
      intent.country === corridorCountry &&
      intent.currency === corridorCurrency &&
      intent.provider === corridorProvider &&
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

    const resolved = resolveMsisdn();
    if (!resolved.ok) {
      setIntentError(resolved.reason);
      return;
    }

    if (!corridorCountry || !corridorCurrency || !corridorProvider) {
      setIntentError("Select a mobile money provider");
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
      msisdn: resolved.msisdn,
      walletAddress: activeAddress,
      country: corridorCountry,
      currency: corridorCurrency,
      provider: corridorProvider,
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

          <div className="space-y-4">
            <div>
              <label
                htmlFor="rwf-input"
                className="text-sm font-medium text-foreground"
              >
                Recipient receives ({displayCurrency})
              </label>
              <div
                className={`relative mt-2 flex items-center rounded-md border bg-background px-4 py-3.5 transition-colors ${
                  amountEntry === "local"
                    ? "border-niko-teal/50"
                    : "border-niko-border focus-within:border-niko-teal/50"
                }`}
              >
                <input
                  id="rwf-input"
                  type="text"
                  inputMode="numeric"
                  value={amountRwf}
                  onChange={(e) => handleRwfChange(e.target.value)}
                  onBlur={validateAmount}
                  className="w-full bg-transparent font-mono text-xl font-bold text-foreground outline-none placeholder:text-niko-muted/40"
                  placeholder="0"
                />
                <span className="ml-3 font-semibold text-niko-teal text-sm">
                  {displayCurrency}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-niko-muted">
              <div className="h-px flex-1 bg-niko-border/60" />
              <span>or enter USDT to sell</span>
              <div className="h-px flex-1 bg-niko-border/60" />
            </div>

            <div>
              <label
                htmlFor="usdt-input"
                className="text-sm font-medium text-foreground"
              >
                You send (USDT)
              </label>
              <div
                className={`relative mt-2 flex items-center rounded-md border bg-background px-4 py-3.5 transition-colors ${
                  amountEntry === "usdt"
                    ? "border-niko-teal/50"
                    : "border-niko-border focus-within:border-niko-teal/50"
                }`}
              >
                <input
                  id="usdt-input"
                  type="text"
                  inputMode="decimal"
                  value={amountUsdt}
                  onChange={(e) => handleUsdtChange(e.target.value)}
                  onBlur={validateAmount}
                  className="w-full bg-transparent font-mono text-xl font-bold text-foreground outline-none placeholder:text-niko-muted/40"
                  placeholder="0.00"
                />
                <span className="ml-3 font-semibold text-niko-teal text-sm">
                  USDT
                </span>
              </div>
            </div>

            {amountError && (
              <p className="text-xs text-red-400">{amountError}</p>
            )}
            {quoteError && !amountError && (
              <p className="text-xs text-red-400">{quoteError}</p>
            )}
            <p className="text-xs text-niko-muted flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-niko-teal" />
              {hasLiveRate
                ? `1 USDT = ${displayRate.toLocaleString()} ${displayCurrency}`
                : quoteError || "Waiting for a live rate"}
              {hasLiveRate && quote ? " (live rate)" : ""}
              {quoteStatus === "loading" && hasAmount ? " · updating" : ""}
            </p>
          </div>

          <div className="rounded-md border border-niko-teal/10 bg-niko-teal/5 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-niko-muted">Recipient Receives</span>
              <span className="font-mono text-foreground font-semibold">
                {hasAmount ? formatPayout(netRwf) : "-"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-niko-muted">
                NikoPay fee ({hasLiveRate ? `${displayFeePercent}%` : "—"} of
                USDT)
              </span>
              <span className="font-mono text-niko-muted">
                {hasAmount && hasLiveRate
                  ? `${formatUsdt(feeUsdtForAmount(usdtAmount, displayFeePercent) ?? 0)} (${formatPayout(feeRwf)})`
                  : "-"}
              </span>
            </div>
            <div className="h-px bg-niko-border/40 my-1" />
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-foreground">
                Total USDT You Send (from wallet)
              </span>
              <span className="text-lg font-bold text-niko-teal-bright font-mono">
                {hasAmount ? formatUsdt(usdtAmount) : "-"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            disabled={!amountQuoteReady || !chainPayReady}
            className="w-full py-4 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {quoteStatus === "loading" && hasAmount
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
              htmlFor="country-select"
              className="text-sm font-medium text-foreground"
            >
              Destination country
            </label>
            <p className="text-xs text-niko-muted mt-1">
              Used for the local dial code. Entering an international number can
              switch this automatically.
            </p>
            <select
              id="country-select"
              value={corridorCountry}
              disabled={corridorLoading || corridorCountries.length === 0}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="mt-3 w-full rounded-md border border-niko-border bg-background px-4 py-3.5 text-sm text-foreground outline-none focus:border-niko-teal/50 disabled:opacity-50"
            >
              {corridorCountries.length === 0 ? (
                <option value="">No countries available</option>
              ) : (
                corridorCountries.map((row) => (
                  <option key={row.country} value={row.country}>
                    {row.displayName} (+{row.prefix})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="msisdn-input"
              className="text-sm font-medium text-foreground"
            >
              Recipient mobile money number
            </label>
            <p className="text-xs text-niko-muted mt-1">
              Enter the local number without the country code. Pasting +… can
              switch country. We validate with PawaPay before continuing.
            </p>
            <div className="relative mt-3 flex items-center rounded-md border border-niko-border bg-background px-4 py-3.5 focus-within:border-niko-teal/50 transition-colors">
              {dialPrefix ? (
                <span className="mr-2 font-mono text-sm font-semibold text-niko-muted shrink-0">
                  +{dialPrefix}
                </span>
              ) : null}
              <input
                id="msisdn-input"
                type="text"
                inputMode="tel"
                value={msisdn}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[+\d\s-]*$/.test(val)) {
                    handleMsisdnChange(val);
                  }
                }}
                onBlur={handleMsisdnBlur}
                className="w-full bg-transparent font-mono text-lg font-semibold text-foreground outline-none placeholder:text-niko-muted/40"
                placeholder={dialPrefix ? "e.g. 0783456789" : "mobile number"}
              />
              <span className="ml-3 font-semibold text-niko-teal text-xs tracking-wider uppercase shrink-0">
                {verifiedMsisdn
                  ? (selectedCorridor?.displayName ?? "MMO")
                  : "—"}
              </span>
            </div>
            {msisdnError && (
              <p className="mt-2 text-xs text-red-400">{msisdnError}</p>
            )}

            {formattedMsisdn && verifiedMsisdn && !msisdnError && (
              <div className="mt-3 p-3 rounded-lg bg-niko-surface/80 border border-niko-border/40 flex justify-between items-center">
                <span className="text-xs text-niko-muted">
                  Validated number
                </span>
                <span className="text-xs font-mono font-bold text-niko-teal-bright">
                  {formattedMsisdn}
                </span>
              </div>
            )}
            <RecipientNamePreviewCard
              status={recipientNameStatus}
              displayName={recipientName}
              providerLabel={
                selectedCorridor?.displayName ?? "the mobile money provider"
              }
            />
          </div>

          <div>
            <label
              htmlFor="provider-select"
              className="text-sm font-medium text-foreground"
            >
              Mobile money provider
            </label>
            <p className="text-xs text-niko-muted mt-1">
              {corridorLoading
                ? "Loading providers from PawaPay…"
                : `${selectedCountry?.displayName ?? corridorCountry} · amounts in ${corridorCurrency}`}
            </p>
            <select
              id="provider-select"
              value={corridorProvider}
              disabled={corridorLoading || corridorProviders.length === 0}
              onChange={(e) => {
                const next = corridorProviders.find(
                  (row) => row.provider === e.target.value,
                );
                setCorridorProvider(e.target.value);
                if (next) {
                  setCorridorCountry(next.country);
                  setCorridorCurrency(next.currency);
                  if (verifiedMsisdn) {
                    void loadRecipientName({
                      msisdn: verifiedMsisdn,
                      country: next.country,
                      provider: next.provider,
                    });
                  }
                }
                setCorridorError("");
              }}
              className="mt-3 w-full rounded-md border border-niko-border bg-background px-4 py-3.5 font-mono text-sm text-foreground outline-none focus:border-niko-teal/50 disabled:opacity-50"
            >
              {corridorProviders.length === 0 ? (
                <option value="">No providers available</option>
              ) : (
                corridorProviders.map((row) => (
                  <option key={row.provider} value={row.provider}>
                    {row.displayName} ({row.provider})
                  </option>
                ))
              )}
            </select>
            {selectedCorridor ? (
              <p className="mt-2 text-[11px] font-mono text-niko-muted">
                Min {selectedCorridor.minAmount} · max{" "}
                {selectedCorridor.maxAmount} {selectedCorridor.currency}
                {selectedCorridor.decimalsInAmount === "NONE"
                  ? " · whole amounts only"
                  : ""}
              </p>
            ) : null}
            {selectedCorridor?.payoutStatus === "DELAYED" ? (
              <p className="mt-2 text-xs text-[var(--niko-warning-text)]">
                This provider is delayed. The payout can still go through, but
                SMS may take longer than usual.
              </p>
            ) : null}
            {selectedCorridor?.payoutStatus === "CLOSED" ? (
              <p className="mt-2 text-xs text-red-400">
                This provider is closed right now. Pick another or try later.
              </p>
            ) : null}
            {selectedCorridor?.rateConfigured === false ? (
              <p className="mt-2 text-xs text-red-400">
                No live NikoPay rate for {selectedCorridor.currency} yet. You
                can review the number, but payouts for this corridor are paused
                until ops sets a rate.
              </p>
            ) : null}
            {quoteError && selectedCorridor?.rateConfigured !== false ? (
              <p className="mt-2 text-xs text-red-400">{quoteError}</p>
            ) : null}
            {corridorError ? (
              <p className="mt-2 text-xs text-red-400">{corridorError}</p>
            ) : null}
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
              We email you when the mobile money payout completes or failed. No
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
              <strong>Double-check the number before you pay.</strong> If the
              name does not match the person you intend, stop and correct the
              number. A wrong Mobile Money number can fail, or send money to
              someone else. Completed payouts cannot be reversed.
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
              disabled={
                selectedCorridor?.payoutStatus === "CLOSED" ||
                selectedCorridor?.rateConfigured === false ||
                !amountQuoteReady
              }
              className="w-2/3 py-4 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all shadow-[0_0_20px_rgba(0,212,200,0.15)] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                {amountQuoteReady ? formatPayout(netRwf) : "—"}
              </div>

              <div className="text-niko-muted">Exchange Rate</div>
              <div className="text-right font-mono text-foreground">
                {hasLiveRate
                  ? `1 USDT = ${displayRate.toLocaleString()} ${displayCurrency}`
                  : quoteError || "No live rate"}
              </div>

              <div className="text-niko-muted">
                NikoPay fee ({hasLiveRate ? `${displayFeePercent}%` : "—"} of
                USDT)
              </div>
              <div className="text-right font-mono text-niko-muted">
                {amountQuoteReady
                  ? `${formatUsdt(
                      feeUsdtForAmount(usdtAmount, displayFeePercent ?? 0) ?? 0,
                    )} (${formatPayout(feeRwf)})`
                  : "—"}
              </div>

              <div className="col-span-2 h-px bg-niko-border/60 my-1" />

              <div className="text-base font-bold text-foreground">
                Total USDT to Send
              </div>
              <div className="text-xl font-bold text-niko-teal-bright text-right font-mono animate-pulse-glow">
                {amountQuoteReady ? formatUsdt(usdtAmount) : "—"}
              </div>

              <div className="text-niko-muted">Mobile money number</div>
              <div className="font-mono font-bold text-right text-foreground">
                {formattedMsisdn}
              </div>

              {recipientNameStatus === "found" && recipientName ? (
                <>
                  <div className="text-niko-muted">Recipient name</div>
                  <div className="font-semibold text-right text-foreground">
                    {recipientName}
                  </div>
                </>
              ) : recipientNameStatus === "unavailable" ||
                recipientNameStatus === "not_found" ? (
                <>
                  <div className="text-niko-muted">Recipient name</div>
                  <div className="text-right text-[var(--niko-warning-text)] text-sm">
                    {recipientNameStatus === "not_found"
                      ? "No registered name found"
                      : "Preview unavailable — check the number"}
                  </div>
                </>
              ) : null}

              <div className="text-niko-muted">Provider</div>
              <div className="font-mono font-bold text-right text-foreground">
                {selectedCorridor?.displayName ?? corridorProvider}
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
                onClick={handleConnectWallet}
                className="shrink-0 py-2.5 px-4 bg-niko-teal hover:bg-niko-teal-bright text-niko-navy font-bold rounded-md transition-all flex items-center gap-1.5 text-xs"
              >
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
              </button>
            </div>
          )}

          {(intentError || walletDrifted || quoteError) && (
            <p className="text-xs text-red-400">
              {walletDrifted
                ? "Active wallet account changed. Confirm again to create a payment for this wallet."
                : intentError || quoteError}
            </p>
          )}

          <div className="p-4 rounded-md border border-[var(--niko-warning-border)] bg-[var(--niko-warning-bg)] text-xs text-[var(--niko-warning-text)] leading-relaxed">
            {recipientNameStatus === "found" && recipientName
              ? `Paying ${recipientName}. If that is not the right person, go back and change the number. Completed payouts cannot be reversed.`
              : recipientNameStatus === "not_found"
                ? "No registered name was found for this number. Double-check every digit before you pay. Completed payouts cannot be reversed."
                : `Name preview is unavailable for ${selectedCorridor?.displayName ?? "this provider"}. Double-check every digit. A wrong number can fail or pay someone else. Completed payouts cannot be reversed.`}
          </div>

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
                    First you sign an offramp consent that shows the USDT
                    amount, treasury, and mobile money recipient. Then your
                    wallet sends USDT to the NikoPay treasury. {displayCurrency}{" "}
                    is paid after the deposit is confirmed on {chainConfig.name}
                    .
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
                      <span>Mobile money recipient</span>
                      <span className="font-mono text-foreground">
                        {liveIntent.msisdn}
                      </span>
                    </div>
                  )}
                </div>

                {payError && <p className="text-xs text-red-400">{payError}</p>}

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
              <WalletPicker
                onSelect={(kind) => void handleGateWalletConnect(kind)}
              />
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
