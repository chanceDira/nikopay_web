import type { ChainId } from "@/lib/settlement/types";

export type PublicChainConfig = {
  id: ChainId;
  chainId: number;
  hexChainId: `0x${string}`;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  usdtAddress: string;
  usdtDecimals: number;
  tokenReady: boolean;
};

const PLACEHOLDER_TOKEN = "0x0000000000000000000000000000000000000001";

export const PUBLIC_CHAINS: Record<ChainId, PublicChainConfig> = {
  base: {
    id: "base",
    chainId: 84532,
    hexChainId: "0x14a34",
    name: "Base Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://sepolia.base.org"],
    blockExplorerUrls: ["https://sepolia.basescan.org"],
    usdtAddress: "0x976691a612095be4c84f255732ccf14f19800479",
    usdtDecimals: 6,
    tokenReady: true,
  },
  polygon: {
    id: "polygon",
    chainId: 80002,
    hexChainId: "0x13882",
    name: "Polygon Amoy",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://rpc-amoy.polygon.technology"],
    blockExplorerUrls: ["https://amoy.polygonscan.com"],
    usdtAddress: PLACEHOLDER_TOKEN,
    usdtDecimals: 6,
    tokenReady: false,
  },
};

export function getPublicChain(chain: ChainId): PublicChainConfig {
  return PUBLIC_CHAINS[chain];
}
