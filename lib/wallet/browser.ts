type RpcError = {
  code?: number;
  message?: string;
};

export type EthereumProvider = {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: EthereumProvider[];
  request: (args: {
    method: string;
    params?: unknown;
  }) => Promise<unknown>;
};

export type WalletKind = "MetaMask" | "Coinbase Wallet" | "WalletConnect";

function asProvider(value: unknown): EthereumProvider | null {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as EthereumProvider).request !== "function"
  ) {
    return null;
  }
  return value as EthereumProvider;
}

export function getInjectedProvider(
  kind: WalletKind,
): { ok: true; provider: EthereumProvider } | { ok: false; reason: string } {
  if (kind === "WalletConnect") {
    return {
      ok: false,
      reason: "walletconnect is not enabled yet. use metamask or coinbase wallet",
    };
  }

  if (typeof window === "undefined") {
    return { ok: false, reason: "wallet is only available in the browser" };
  }

  const injected = asProvider(window.ethereum);
  if (!injected) {
    return {
      ok: false,
      reason: "no injected wallet found. install metamask or coinbase wallet",
    };
  }

  const providers = Array.isArray(injected.providers)
    ? injected.providers.filter((item) => asProvider(item))
    : [injected];

  if (kind === "Coinbase Wallet") {
    const coinbase = providers.find((item) => item.isCoinbaseWallet);
    if (!coinbase) {
      return { ok: false, reason: "coinbase wallet is not installed" };
    }
    return { ok: true, provider: coinbase };
  }

  const metamask = providers.find(
    (item) => item.isMetaMask && !item.isCoinbaseWallet,
  );
  if (metamask) {
    return { ok: true, provider: metamask };
  }

  if (injected.isMetaMask || providers.length === 1) {
    return { ok: true, provider: injected };
  }

  return { ok: false, reason: "metamask is not installed" };
}

export function walletErrorMessage(err: unknown): string {
  const rpc = asRpcError(err);
  if (rpc?.code === 4001) {
    return "wallet request was rejected";
  }
  if (rpc?.code === 4902) {
    return "network is not added in the wallet";
  }
  if (rpc?.message && rpc.message.length < 180) {
    return rpc.message;
  }
  return "wallet request failed";
}

function asRpcError(err: unknown): RpcError | null {
  if (typeof err !== "object" || err === null) {
    return null;
  }
  return err as RpcError;
}

export async function requestAccounts(
  provider: EthereumProvider,
): Promise<{ ok: true; address: string } | { ok: false; reason: string }> {
  try {
    const result = await provider.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(result) || typeof result[0] !== "string") {
      return { ok: false, reason: "wallet did not return an address" };
    }
    return { ok: true, address: result[0].toLowerCase() };
  } catch (err) {
    return { ok: false, reason: walletErrorMessage(err) };
  }
}

export async function switchChain(
  provider: EthereumProvider,
  input: {
    hexChainId: `0x${string}`;
    chainId: number;
    name: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: string[];
    blockExplorerUrls: string[];
  },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: input.hexChainId }],
    });
    return { ok: true };
  } catch (err) {
    const rpc = asRpcError(err);
    if (rpc?.code !== 4902) {
      return { ok: false, reason: walletErrorMessage(err) };
    }
  }

  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: input.hexChainId,
          chainName: input.name,
          nativeCurrency: input.nativeCurrency,
          rpcUrls: input.rpcUrls,
          blockExplorerUrls: input.blockExplorerUrls,
        },
      ],
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: walletErrorMessage(err) };
  }
}

export async function signTypedData(
  provider: EthereumProvider,
  address: string,
  typedData: unknown,
): Promise<{ ok: true; signature: string } | { ok: false; reason: string }> {
  try {
    const result = await provider.request({
      method: "eth_signTypedData_v4",
      params: [address, JSON.stringify(typedData)],
    });
    if (typeof result !== "string" || !result.startsWith("0x")) {
      return { ok: false, reason: "wallet did not return a signature" };
    }
    return { ok: true, signature: result };
  } catch (err) {
    return { ok: false, reason: walletErrorMessage(err) };
  }
}

export async function sendTokenTransfer(
  provider: EthereumProvider,
  input: {
    from: string;
    token: string;
    data: `0x${string}`;
  },
): Promise<{ ok: true; txHash: string } | { ok: false; reason: string }> {
  try {
    const result = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: input.from,
          to: input.token,
          data: input.data,
          value: "0x0",
        },
      ],
    });
    if (typeof result !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(result)) {
      return { ok: false, reason: "wallet did not return a transaction hash" };
    }
    return { ok: true, txHash: result.toLowerCase() };
  } catch (err) {
    return { ok: false, reason: walletErrorMessage(err) };
  }
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}
