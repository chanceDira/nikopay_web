import { fetchErc20Balance } from "@/lib/erc20-balance";
import { getAccountBalance } from "@/lib/momo/client";
import { getMomoConfig } from "@/lib/momo/config";
import { CHAIN_IDS, type ChainId } from "@/lib/settlement/types";
import { loadActiveTreasury, loadActiveUsdtToken } from "@/lib/treasury";
import type {
  AdminTreasurySnapshot,
  MomoPoolSnapshot,
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

async function loadMomoPool(): Promise<MomoPoolSnapshot> {
  const config = getMomoConfig();
  if (!config.ok) {
    return config;
  }

  return getAccountBalance(config.config);
}

export async function loadAdminTreasurySnapshot(): Promise<AdminTreasurySnapshot> {
  const [wallets, momo] = await Promise.all([
    Promise.all(CHAIN_IDS.map((chain) => loadWallet(chain))),
    loadMomoPool(),
  ]);

  return { wallets, momo };
}
