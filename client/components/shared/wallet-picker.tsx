"use client";

import Image from "next/image";
import type { WalletKind } from "@/lib/wallet/browser";
import { getWalletConnectProjectId } from "@/lib/wallet/walletconnect";

const OPTIONS: {
  kind: WalletKind;
  label: string;
  src: string;
  badge?: string;
  rounded?: boolean;
}[] = [
  {
    kind: "MetaMask",
    label: "MetaMask",
    src: "/logos/metamask-logo.png",
    badge: "Popular",
  },
  {
    kind: "Coinbase Wallet",
    label: "Coinbase Wallet",
    src: "/logos/coinbase-logo.webp",
    rounded: true,
  },
  {
    kind: "WalletConnect",
    label: "WalletConnect",
    src: "/logos/walletconnect-logo.png",
    badge: "Mobile / multi-wallet",
  },
];

type WalletPickerProps = {
  onSelect: (kind: WalletKind) => void;
  disabled?: boolean;
};

export function WalletPicker({
  onSelect,
  disabled = false,
}: WalletPickerProps) {
  const walletConnectReady = Boolean(getWalletConnectProjectId());

  return (
    <div className="grid grid-cols-1 gap-3">
      {OPTIONS.map((option) => {
        const unavailable =
          option.kind === "WalletConnect" && !walletConnectReady;
        return (
          <button
            key={option.kind}
            type="button"
            disabled={disabled || unavailable}
            onClick={() => onSelect(option.kind)}
            className="flex w-full items-center justify-between rounded-md border border-niko-border bg-background px-4 py-3 text-sm font-sans text-foreground hover:border-niko-teal/40 hover:bg-niko-surface transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-3">
              <Image
                src={option.src}
                alt={option.label}
                width={24}
                height={24}
                className={`h-6 w-6 object-contain ${option.rounded ? "rounded-md" : ""}`}
              />
              {option.label}
            </span>
            {unavailable ? (
              <span className="text-[10px] text-niko-muted">Unavailable</span>
            ) : option.badge ? (
              <span className="text-[10px] text-niko-teal">{option.badge}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
