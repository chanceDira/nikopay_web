import { ingestDeposit, type IngestDepositResult } from "@/lib/deposits";
import { CHAIN_IDS, isChainId, type ChainId } from "@/lib/settlement/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChainRpcUrl, rpcBlockNumber, rpcGetLogs } from "@/lib/chain-rpc";
import {
  confirmedHead,
  nextScanRange,
  parseTransferLog,
  topicForAddress,
  TRANSFER_TOPIC,
} from "@/lib/transfer-log";
import { loadActiveTreasury, loadActiveUsdtToken } from "@/lib/treasury";

const MAX_SPAN = 500;
const FIRST_LOOKBEHIND = 4096;
const MAX_WINDOWS = 4;

export type ChainScanResult =
  | {
      ok: true;
      chain: ChainId;
      fromBlock: number;
      toBlock: number;
      found: number;
      ingested: IngestDepositResult[];
    }
  | {
      ok: true;
      chain: ChainId;
      skipped: true;
      reason: string;
    }
  | { ok: false; chain: ChainId; reason: string };

export async function scanDeposits(
  chainFilter?: ChainId,
): Promise<ChainScanResult[]> {
  const chains = chainFilter ? [chainFilter] : [...CHAIN_IDS];
  const results: ChainScanResult[] = [];

  for (const chain of chains) {
    results.push(await scanChain(chain));
  }

  return results;
}

export function parseScanChain(
  value: string | null,
): { ok: true; chain?: ChainId } | { ok: false; reason: string } {
  if (value === null || value === "") {
    return { ok: true };
  }
  if (!isChainId(value)) {
    return { ok: false, reason: "chain must be polygon or base" };
  }
  return { ok: true, chain: value };
}

async function scanChain(chain: ChainId): Promise<ChainScanResult> {
  const supabase = createAdminClient();
  const chainRow = await supabase
    .from("chains")
    .select("is_active, confirm_blocks")
    .eq("id", chain)
    .maybeSingle();

  if (chainRow.error || !chainRow.data) {
    return { ok: false, chain, reason: "chain is not available" };
  }
  if (!chainRow.data.is_active) {
    return { ok: true, chain, skipped: true, reason: "chain is not available" };
  }

  const token = await loadActiveUsdtToken(chain);
  if (!token.ok) {
    return { ok: false, chain, reason: token.reason };
  }

  const treasury = await loadActiveTreasury(chain);
  if (!treasury.ok) {
    return { ok: false, chain, reason: treasury.reason };
  }

  const rpcUrl = getChainRpcUrl(chain);
  const head = await rpcBlockNumber(rpcUrl);
  if (!head.ok) {
    return { ok: false, chain, reason: head.reason };
  }

  const safeHead = confirmedHead(head.head, chainRow.data.confirm_blocks);
  const ingested: IngestDepositResult[] = [];
  let fromBlock: number | null = null;
  let toBlock: number | null = null;

  for (let window = 0; window < MAX_WINDOWS; window += 1) {
    const lastBlock = await loadLastBlock(chain, safeHead);
    if (!lastBlock.ok) {
      return lastBlock;
    }

    const range = nextScanRange({
      lastBlock: lastBlock.value,
      confirmedHead: safeHead,
      maxSpan: MAX_SPAN,
    });

    if (!range) {
      if (fromBlock === null) {
        return {
          ok: true,
          chain,
          skipped: true,
          reason: "waiting for confirmations",
        };
      }
      break;
    }

    fromBlock ??= range.fromBlock;
    toBlock = range.toBlock;

    const logs = await rpcGetLogs(rpcUrl, {
      fromBlock: range.fromBlock,
      toBlock: range.toBlock,
      address: token.contractAddress,
      topics: [TRANSFER_TOPIC, null, topicForAddress(treasury.address)],
    });

    if (!logs.ok) {
      return { ok: false, chain, reason: logs.reason };
    }

    const stored = await ingestTransferLogs(chain, logs.logs, token.decimals);
    if (!stored.ok) {
      return stored;
    }
    ingested.push(...stored.ingested);

    const saved = await saveLastBlock(chain, range.toBlock);
    if (!saved.ok) {
      return saved;
    }
  }

  return {
    ok: true,
    chain,
    fromBlock: fromBlock ?? 0,
    toBlock: toBlock ?? 0,
    found: ingested.length,
    ingested,
  };
}

async function ingestTransferLogs(
  chain: ChainId,
  logs: unknown[],
  decimals: number,
): Promise<
  | { ok: true; ingested: IngestDepositResult[] }
  | { ok: false; chain: ChainId; reason: string }
> {
  const ingested: IngestDepositResult[] = [];

  for (const log of logs) {
    if (!log || typeof log !== "object") {
      continue;
    }

    const parsed = parseTransferLog(log, decimals);
    if (!parsed) {
      continue;
    }

    const result = await ingestDeposit({
      chain,
      txHash: parsed.txHash,
      logIndex: parsed.logIndex,
      fromAddress: parsed.fromAddress,
      toAddress: parsed.toAddress,
      tokenAddress: parsed.tokenAddress,
      amount: parsed.amount,
      blockNumber: parsed.blockNumber,
    });

    if (!result.ok) {
      return { ok: false, chain, reason: result.reason };
    }

    ingested.push(result.result);
  }

  return { ok: true, ingested };
}

async function loadLastBlock(
  chain: ChainId,
  safeHead: number,
): Promise<
  { ok: true; value: number } | { ok: false; chain: ChainId; reason: string }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chain_sync")
    .select("last_block")
    .eq("chain_id", chain)
    .maybeSingle();

  if (error) {
    return { ok: false, chain, reason: "unable to load chain sync" };
  }

  if (!data) {
    return { ok: true, value: Math.max(0, safeHead - FIRST_LOOKBEHIND) };
  }

  return { ok: true, value: data.last_block };
}

async function saveLastBlock(
  chain: ChainId,
  lastBlock: number,
): Promise<{ ok: true } | { ok: false; chain: ChainId; reason: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("chain_sync").upsert(
    {
      chain_id: chain,
      last_block: lastBlock,
    },
    { onConflict: "chain_id" },
  );

  if (error) {
    return { ok: false, chain, reason: "unable to save chain sync" };
  }

  return { ok: true };
}
