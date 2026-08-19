import { getPublicChain } from "@/lib/chain-config";
import type { ChainId } from "@/lib/settlement/types";
import {
  walletErrorMessage,
  type EthereumProvider,
} from "@/lib/wallet/browser";

type WalletConnectClient = EthereumProvider & {
  session?: unknown;
  connect: (input?: { chains?: number[] }) => Promise<unknown>;
  on: (event: string, listener: () => void) => void;
};

let client: WalletConnectClient | null = null;
let initLock: Promise<
  { ok: true; client: WalletConnectClient } | { ok: false; reason: string }
> | null = null;

export function getWalletConnectProjectId(): string | null {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
  return projectId || null;
}

export async function connectWalletConnect(
  chainId: ChainId,
): Promise<
  { ok: true; provider: EthereumProvider } | { ok: false; reason: string }
> {
  const ready = await initWalletConnect();
  if (!ready.ok) {
    return ready;
  }

  const chain = getPublicChain(chainId);
  try {
    if (!ready.client.session) {
      await ready.client.connect({ chains: [chain.chainId] });
    }
  } catch (err) {
    return { ok: false, reason: walletErrorMessage(err) };
  }

  return { ok: true, provider: ready.client };
}

export async function restoreWalletConnect(): Promise<
  { ok: true; provider: EthereumProvider } | { ok: false; reason: string }
> {
  const ready = await initWalletConnect();
  if (!ready.ok) {
    return ready;
  }
  if (!ready.client.session) {
    return { ok: false, reason: "walletconnect session expired. reconnect" };
  }
  return { ok: true, provider: ready.client };
}

async function initWalletConnect(): Promise<
  { ok: true; client: WalletConnectClient } | { ok: false; reason: string }
> {
  if (client) {
    return { ok: true, client };
  }
  if (initLock) {
    return initLock;
  }

  initLock = createWalletConnectClient();
  const result = await initLock;
  initLock = null;
  return result;
}

async function createWalletConnectClient(): Promise<
  { ok: true; client: WalletConnectClient } | { ok: false; reason: string }
> {
  const projectId = getWalletConnectProjectId();
  if (!projectId) {
    return { ok: false, reason: "walletconnect is not configured" };
  }

  if (typeof window === "undefined") {
    return { ok: false, reason: "wallet is only available in the browser" };
  }

  const base = getPublicChain("base");
  const polygon = getPublicChain("polygon");
  const origin = window.location.origin;

  try {
    const { default: WalletConnectEthereumProvider } = await import(
      "@walletconnect/ethereum-provider"
    );
    const provider = (await WalletConnectEthereumProvider.init({
      projectId,
      showQrModal: true,
      chains: [base.chainId],
      optionalChains: [polygon.chainId],
      rpcMap: {
        [base.chainId]: base.rpcUrls[0],
        [polygon.chainId]: polygon.rpcUrls[0],
      },
      methods: [
        "eth_sendTransaction",
        "eth_signTypedData_v4",
        "personal_sign",
        "wallet_switchEthereumChain",
        "wallet_addEthereumChain",
      ],
      optionalMethods: ["wallet_watchAsset", "eth_requestAccounts"],
      events: ["chainChanged", "accountsChanged"],
      metadata: {
        name: "NikoPay",
        description: "USDT to MTN Mobile Money",
        url: origin,
        icons: [`${origin}/nikopay-logo.png`],
      },
    })) as WalletConnectClient;

    provider.on("disconnect", () => {
      client = null;
    });
    client = provider;
    return { ok: true, client: provider };
  } catch (err) {
    return { ok: false, reason: walletErrorMessage(err) };
  }
}
