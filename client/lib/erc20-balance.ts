import { getChainRpcUrl, rpcEthCall } from "@/lib/chain-rpc";
import { hexQuantityToTokenAmount } from "@/lib/transfer-log";
import { encodeErc20BalanceOf } from "@/lib/wallet/encoding";
import type { ChainId } from "@/lib/settlement/types";

const PLACEHOLDER_TOKEN = "0x0000000000000000000000000000000000000001";

export function isQueryableToken(address: string): boolean {
  const normalized = address.toLowerCase();
  return normalized !== PLACEHOLDER_TOKEN && !/^0x0+$/.test(normalized);
}

export async function fetchErc20Balance(input: {
  chain: ChainId;
  token: string;
  holder: string;
  decimals: number;
}): Promise<{ ok: true; amount: number } | { ok: false; reason: string }> {
  if (!isQueryableToken(input.token)) {
    return { ok: false, reason: "token is not configured for this chain" };
  }

  const encoded = encodeErc20BalanceOf(input.holder);
  if (!encoded.ok) {
    return encoded;
  }

  const called = await rpcEthCall(
    getChainRpcUrl(input.chain),
    input.token,
    encoded.data,
  );
  if (!called.ok) {
    return called;
  }

  const amount = hexQuantityToTokenAmount(called.data, input.decimals);
  if (amount === null) {
    return { ok: false, reason: "token balance is unavailable" };
  }

  return { ok: true, amount };
}
