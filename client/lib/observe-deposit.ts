import { ingestDeposit, type IngestDepositResult } from "@/lib/deposits";
import { normalizeTxHash } from "@/lib/identity";
import { getChainRpcUrl, rpcCall } from "@/lib/chain-rpc";
import { parseTransferLog, type ParsedTransferLog } from "@/lib/transfer-log";
import { isChainId } from "@/lib/settlement/types";
import { loadActiveTreasury, loadActiveUsdtToken } from "@/lib/treasury";

type RpcReceipt = {
  status?: unknown;
  blockNumber?: unknown;
  transactionHash?: unknown;
  logs?: unknown;
};

export async function observeDepositTx(input: {
  chain: unknown;
  txHash: unknown;
}): Promise<
  | { ok: true; result: IngestDepositResult }
  | { ok: false; reason: string; status: number }
> {
  if (!isChainId(input.chain)) {
    return { ok: false, reason: "chain must be polygon or base", status: 400 };
  }

  const txHash = normalizeTxHash(input.txHash);
  if (!txHash.ok) {
    return { ok: false, reason: txHash.reason, status: 400 };
  }

  const token = await loadActiveUsdtToken(input.chain);
  if (!token.ok) {
    return { ok: false, reason: token.reason, status: 409 };
  }

  const treasury = await loadActiveTreasury(input.chain);
  if (!treasury.ok) {
    return { ok: false, reason: treasury.reason, status: 409 };
  }

  const receipt = await rpcCall<RpcReceipt | null>(
    getChainRpcUrl(input.chain),
    "eth_getTransactionReceipt",
    [txHash.txHash],
  );
  if (!receipt.ok) {
    return { ok: false, reason: receipt.reason, status: 503 };
  }
  if (!receipt.result) {
    return {
      ok: false,
      reason: "transaction is not confirmed yet",
      status: 409,
    };
  }
  if (receipt.result.status !== "0x1") {
    return { ok: false, reason: "transaction failed", status: 409 };
  }

  const transfers = transfersToTreasury(
    receipt.result,
    txHash.txHash,
    token.contractAddress,
    treasury.address,
    token.decimals,
  );
  if (transfers.length === 0) {
    return {
      ok: false,
      reason: "no usdt transfer to treasury in this transaction",
      status: 409,
    };
  }

  let last: IngestDepositResult | null = null;
  for (const transfer of transfers) {
    const ingested = await ingestDeposit({
      chain: input.chain,
      txHash: transfer.txHash,
      logIndex: transfer.logIndex,
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      tokenAddress: transfer.tokenAddress,
      amount: transfer.amount,
      blockNumber: transfer.blockNumber,
    });
    if (!ingested.ok) {
      return ingested;
    }
    last = ingested.result;
  }

  if (!last) {
    return { ok: false, reason: "unable to ingest deposit", status: 503 };
  }

  return { ok: true, result: last };
}

export function transfersToTreasury(
  receipt: RpcReceipt,
  txHash: string,
  tokenAddress: string,
  treasuryAddress: string,
  decimals: number,
): ParsedTransferLog[] {
  if (!Array.isArray(receipt.logs)) {
    return [];
  }

  const token = tokenAddress.toLowerCase();
  const treasury = treasuryAddress.toLowerCase();
  const found: ParsedTransferLog[] = [];

  for (const log of receipt.logs) {
    if (!log || typeof log !== "object") {
      continue;
    }

    const record = log as Record<string, unknown>;
    const parsed = parseTransferLog(
      {
        ...record,
        transactionHash:
          typeof record.transactionHash === "string"
            ? record.transactionHash
            : txHash,
      },
      decimals,
    );
    if (!parsed) {
      continue;
    }
    if (parsed.tokenAddress !== token || parsed.toAddress !== treasury) {
      continue;
    }
    found.push(parsed);
  }

  return found;
}
