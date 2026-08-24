"use client";

import { useEffect, useState } from "react";
import { useAdminIntents } from "@/components/admin/use-admin-intents";
import { summarizeAdminIntents } from "@/lib/admin-metrics";
import type {
  AdminTreasurySnapshot,
  MomoPoolSnapshot,
  TreasuryWalletSnapshot,
} from "@/lib/admin-treasury-types";
import { formatRwf, formatUsdt } from "@/lib/rates";
import type { ChainId } from "@/lib/settlement/types";

const CHAIN_LABEL: Record<ChainId, string> = {
  polygon: "Polygon USDT vault",
  base: "Base USDT vault",
};

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AdminTreasuryCards() {
  const { intents, loading: intentsLoading } = useAdminIntents();
  const [snapshot, setSnapshot] = useState<AdminTreasurySnapshot | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/admin/treasury");
        const json = (await res.json()) as {
          data?: AdminTreasurySnapshot;
          error?: string;
        };
        if (cancelled) {
          return;
        }
        if (!res.ok || !json.data) {
          setError(json.error ?? "Unable to load treasury.");
          return;
        }
        setSnapshot(json.data);
        setError("");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if ((loading || intentsLoading) && !snapshot) {
    return (
      <div className="flex items-center justify-center py-20 text-niko-muted text-sm font-mono">
        Loading...
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <p className="text-sm font-mono text-red-400">
        {error || "Unable to load treasury."}
      </p>
    );
  }

  const metrics = summarizeAdminIntents(intents);

  return (
    <div className="space-y-6">
      <MomoPoolCard momo={snapshot.momo} paidRwf={metrics.paidRwf} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {snapshot.wallets.map((wallet) => (
          <VaultCard
            key={wallet.chain}
            wallet={wallet}
            receivedUsdt={metrics.matchedUsdtByChain[wallet.chain]}
          />
        ))}
      </div>
    </div>
  );
}

function MomoPoolCard(props: { momo: MomoPoolSnapshot; paidRwf: number }) {
  const available =
    props.momo.ok && props.momo.currency.toUpperCase() === "RWF"
      ? props.momo.availableBalance
      : null;
  const isLow = available !== null && available < 1_000_000;

  return (
    <div className="space-y-6">
      {isLow ? (
        <div className="p-4 rounded-md border border-[var(--niko-warning-border)] bg-[var(--niko-warning-bg)] text-xs text-[var(--niko-warning-text)] leading-relaxed">
          <strong className="font-semibold block mb-0.5">
            Low MoMo RWF balance
          </strong>
          <p>
            The disbursement account is below RWF 1,000,000. Large payouts may
            fail until the pool is funded on-chain with MTN.
          </p>
        </div>
      ) : null}

      <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
        <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
          MTN disbursement balance
        </p>
        <h3 className="text-2xl font-bold font-mono text-foreground mt-3">
          {props.momo.ok
            ? formatMomoBalance(
                props.momo.availableBalance,
                props.momo.currency,
              )
            : "Unavailable"}
        </h3>
        <p className="text-xs text-niko-muted mt-1 font-sans">
          {props.momo.ok
            ? "Live balance from the MTN MoMo disbursement API."
            : props.momo.reason}
        </p>
        <div className="mt-6 flex items-center justify-between text-xs text-niko-muted font-mono border-t border-niko-border/10 pt-4">
          <span>RWF paid from intents</span>
          <span className="text-foreground">{formatRwf(props.paidRwf)}</span>
        </div>
      </div>
    </div>
  );
}

function VaultCard(props: {
  wallet: TreasuryWalletSnapshot;
  receivedUsdt: number;
}) {
  const { wallet, receivedUsdt } = props;

  return (
    <div className="rounded-md border border-niko-border/40 bg-[var(--niko-card-bg)] backdrop-blur-md p-6 shadow-md">
      <p className="text-xs font-mono uppercase tracking-widest text-niko-muted">
        {CHAIN_LABEL[wallet.chain]}
      </p>
      <h3 className="text-2xl font-bold font-mono text-foreground mt-3">
        {wallet.usdtBalance === null
          ? "Unavailable"
          : formatUsdt(wallet.usdtBalance)}
      </h3>
      <p className="text-xs text-niko-muted mt-1 font-sans font-mono">
        {wallet.address ? shortenAddress(wallet.address) : "Not configured"}
      </p>
      {wallet.error ? (
        <p className="text-xs text-amber-500 mt-2">{wallet.error}</p>
      ) : (
        <p className="text-xs text-niko-muted mt-1 font-sans">
          On-chain USDT at the active treasury address.
        </p>
      )}
      <div className="mt-6 flex items-center justify-between text-xs text-niko-muted font-mono border-t border-niko-border/10 pt-4">
        <span>Matched deposits</span>
        <span className="text-foreground">{formatUsdt(receivedUsdt)}</span>
      </div>
    </div>
  );
}

function formatMomoBalance(amount: number, currency: string): string {
  if (currency.toUpperCase() === "RWF") {
    return formatRwf(amount);
  }

  return `${amount.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ${currency}`;
}
