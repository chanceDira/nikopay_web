import { getPublicChain } from "@/lib/chain-config";
import type { PaymentIntent } from "@/lib/settlement/types";
import { sameWalletAddress } from "@/lib/wallet-session";
import {
  getInjectedProvider,
  requestAccounts,
  sendTokenTransfer,
  signTypedData,
  switchChain,
  type EthereumProvider,
  type WalletKind,
} from "@/lib/wallet/browser";
import { buildOfframpTypedData } from "@/lib/wallet/consent";
import { encodeErc20Transfer, usdtToTokenUnits } from "@/lib/wallet/encoding";
import {
  connectWalletConnect,
  restoreWalletConnect,
} from "@/lib/wallet/walletconnect";

export async function connectInjectedWallet(
  kind: WalletKind,
  chainId: PaymentIntent["chain"],
): Promise<
  | { ok: true; address: string; walletName: WalletKind }
  | { ok: false; reason: string }
> {
  const found = await resolveWalletProvider(kind, chainId, true);
  if (!found.ok) {
    return found;
  }

  const chain = getPublicChain(chainId);
  const switched = await switchChain(found.provider, chain);
  if (!switched.ok) {
    return switched;
  }

  const account = await requestAccounts(found.provider);
  if (!account.ok) {
    return account;
  }

  await suggestUsdtToken(found.provider, chain);

  return { ok: true, address: account.address, walletName: kind };
}

async function suggestUsdtToken(
  provider: EthereumProvider,
  chain: ReturnType<typeof getPublicChain>,
): Promise<void> {
  if (!chain.tokenReady) {
    return;
  }

  try {
    await provider.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: chain.usdtAddress,
          symbol: "USDT",
          decimals: chain.usdtDecimals,
        },
      },
    });
  } catch {
    return;
  }
}

export async function consentAndTransferUsdt(input: {
  intent: PaymentIntent;
  walletName: WalletKind;
}): Promise<{ ok: true; txHash: string } | { ok: false; reason: string }> {
  const chain = getPublicChain(input.intent.chain);
  if (!chain.tokenReady) {
    return {
      ok: false,
      reason: `${chain.name} test USDT is not configured yet`,
    };
  }

  const found = await resolveWalletProvider(
    input.walletName,
    input.intent.chain,
    false,
  );
  if (!found.ok) {
    return found;
  }

  const switched = await switchChain(found.provider, chain);
  if (!switched.ok) {
    return switched;
  }

  const account = await requestAccounts(found.provider);
  if (!account.ok) {
    return account;
  }
  if (!sameWalletAddress(account.address, input.intent.walletAddress)) {
    return {
      ok: false,
      reason:
        "active wallet account changed. reconnect, then confirm again so the payment matches this wallet",
    };
  }

  const typedData = buildOfframpTypedData(input.intent);
  if (!typedData) {
    return { ok: false, reason: "unable to build consent message" };
  }

  const signed = await signTypedData(
    found.provider,
    account.address,
    typedData,
  );
  if (!signed.ok) {
    return signed;
  }

  const units = usdtToTokenUnits(input.intent.usdtAmount, chain.usdtDecimals);
  if (units == null) {
    return { ok: false, reason: "usdt amount is invalid" };
  }

  const encoded = encodeErc20Transfer(input.intent.treasuryAddress, units);
  if (!encoded.ok) {
    return encoded;
  }

  return sendTokenTransfer(found.provider, {
    from: account.address,
    token: chain.usdtAddress,
    data: encoded.data,
  });
}

async function resolveWalletProvider(
  kind: WalletKind,
  chainId: PaymentIntent["chain"],
  connect: boolean,
): Promise<
  { ok: true; provider: EthereumProvider } | { ok: false; reason: string }
> {
  if (kind !== "WalletConnect") {
    return getInjectedProvider(kind);
  }
  return connect ? connectWalletConnect(chainId) : restoreWalletConnect();
}
