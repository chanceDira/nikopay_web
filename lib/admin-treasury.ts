import { fetchErc20Balance } from "@/lib/erc20-balance";
import { getAccountBalance } from "@/lib/momo/client";
import { getMomoConfig } from "@/lib/momo/config";
import { getWalletBalances } from "@/lib/pawapay/client";
import {
  getPawapayConfig,
  getPayoutProvider,
  isPawapayConfigured,
} from "@/lib/pawapay/config";
import { toNumber } from "@/lib/numbers";
import { CHAIN_IDS, type ChainId } from "@/lib/settlement/types";
import { loadActiveTreasury, loadActiveUsdtToken } from "@/lib/treasury";
import type {
  AdminTreasurySnapshot,
  MomoPoolSnapshot,
  PawapayPoolSnapshot,
  TreasuryWalletSnapshot,
} from "@/lib/admin-treasury-types";

async function loadWallet(chain: ChainId): Promise<TreasuryWalletSnapshot> {
  const token = await loadActiveUsdtToken(chain);
  if (!token.ok) {
    return { chain, address: null, usdtBalance: null, error: token.reason };
  }

  const treasury = await loadActiveTreasury(chain);
  if (!treasury.ok) {
    return { chain, address: null, usdtBalance: null, error: treasury.reason };
  }

  const balance = await fetchErc20Balance({
    chain,
    token: token.contractAddress,
    holder: treasury.address,
    decimals: token.decimals,
  });

  if (!balance.ok) {
    return {
      chain,
      address: treasury.address,
      usdtBalance: null,
      error: balance.reason,
    };
  }

  return {
    chain,
    address: treasury.address,
    usdtBalance: balance.amount,
    error: null,
  };
}

async function loadMomoPool(): Promise<MomoPoolSnapshot | null> {
  const config = getMomoConfig();
  if (!config.ok) {
    return null;
  }

  return getAccountBalance(config.config);
}

async function loadPawapayPool(): Promise<PawapayPoolSnapshot | null> {
  if (!isPawapayConfigured()) {
    return null;
  }

  const configured = getPawapayConfig();
  if (!configured.ok) {
    return { ok: false, reason: configured.reason };
  }

  const balances = await getWalletBalances(configured.config, {
    country: "RWA",
  });
  if (!balances.ok) {
    return { ok: false, reason: balances.reason };
  }

  const rwa = balances.data.find(
    (row) => row.country === "RWA" && row.currency === "RWF",
  );
  if (!rwa) {
    return { ok: false, reason: "RWA RWF balance not found" };
  }

  const availableBalance = toNumber(rwa.balance);
  if (!Number.isFinite(availableBalance)) {
    return { ok: false, reason: "RWA RWF balance is invalid" };
  }

  return {
    ok: true,
    availableBalance,
    currency: rwa.currency,
    country: rwa.country,
  };
}

export async function loadAdminTreasurySnapshot(): Promise<AdminTreasurySnapshot> {
  const payoutProvider = getPayoutProvider();
  const [wallets, momo, pawapay] = await Promise.all([
    Promise.all(CHAIN_IDS.map((chain) => loadWallet(chain))),
    loadMomoPool(),
    loadPawapayPool(),
  ]);

  return { wallets, payoutProvider, momo, pawapay };
}
