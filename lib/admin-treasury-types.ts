import type { ChainId } from "@/lib/settlement/types";

export type TreasuryWalletSnapshot = {
  chain: ChainId;
  address: string | null;
  usdtBalance: number | null;
  error: string | null;
};

export type PawapayPoolSnapshot =
  | { ok: true; availableBalance: number; currency: string; country: string }
  | { ok: false; reason: string };

export type AdminTreasurySnapshot = {
  wallets: TreasuryWalletSnapshot[];
  pawapay: PawapayPoolSnapshot | null;
};
