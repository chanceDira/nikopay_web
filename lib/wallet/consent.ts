import { getPublicChain } from "@/lib/chain-config";
import type { PaymentIntent } from "@/lib/settlement/types";

export type OfframpTypedData = {
  types: {
    OfframpConsent: { name: string; type: string }[];
  };
  primaryType: "OfframpConsent";
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  message: {
    intentId: string;
    action: string;
    chain: string;
    token: string;
    treasury: string;
    usdtAmount: string;
    netRwf: string;
    recipientMomo: string;
    expiresAt: string;
    notice: string;
  };
};

export function buildOfframpTypedData(
  intent: PaymentIntent,
): OfframpTypedData | null {
  const chain = getPublicChain(intent.chain);
  if (!chain.tokenReady) {
    return null;
  }

  return {
    types: {
      OfframpConsent: [
        { name: "intentId", type: "string" },
        { name: "action", type: "string" },
        { name: "chain", type: "string" },
        { name: "token", type: "address" },
        { name: "treasury", type: "address" },
        { name: "usdtAmount", type: "string" },
        { name: "netRwf", type: "string" },
        { name: "recipientMomo", type: "string" },
        { name: "expiresAt", type: "string" },
        { name: "notice", type: "string" },
      ],
    },
    primaryType: "OfframpConsent",
    domain: {
      name: "NikoPay",
      version: "1",
      chainId: chain.chainId,
      verifyingContract: chain.usdtAddress,
    },
    message: {
      intentId: intent.id,
      action: "USDT to mobile money RWF offramp",
      chain: chain.name,
      token: chain.usdtAddress,
      treasury: intent.treasuryAddress,
      usdtAmount: `${intent.usdtAmount} USDT`,
      netRwf: `${intent.netRwf} RWF`,
      recipientMomo: intent.msisdn,
      expiresAt: intent.expiresAt,
      notice:
        "This signature does not move funds. A second wallet prompt sends the exact USDT amount to the NikoPay treasury. RWF is paid to the mobile money number above after the deposit is confirmed!",
    },
  };
}
