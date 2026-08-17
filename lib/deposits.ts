import { asRecord, parseNonNegativeInt, parseUsdtAmount } from "@/lib/http";
import { normalizeHexAddress, normalizeTxHash } from "@/lib/identity";
import { toPaymentIntent } from "@/lib/intents";
import { isChainId, type ChainId } from "@/lib/settlement/types";
import { transitionStatus } from "@/lib/settlement/intent-status";
import {
  matchDeposit,
  type MatchableIntent,
} from "@/lib/settlement/match-deposit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChainDepositRow, PaymentIntentRow } from "@/lib/supabase/types";
import { loadActiveTreasury, loadActiveUsdtToken } from "@/lib/treasury";

const UNIQUE_VIOLATION = "23505";

export type DepositEvent = {
  chain: ChainId;
  txHash: string;
  logIndex: number;
  fromAddress: string;
  toAddress: string;
  tokenAddress: string;
  amount: number;
  blockNumber: number;
};

export type IngestDepositResult = {
  depositId: string;
  replay: boolean;
  outcome: "credited" | "manual_review" | "expired" | "unmatched";
  intentIds: string[];
};

export function parseDepositEvent(
  body: unknown,
) : { ok: true; event: DepositEvent } | { ok: false; reason: string } {
  const record = asRecord(body);
  if (!record) {
    return { ok: false, reason: "invalid request body" };
  }

  if (!isChainId(record.chain)) {
    return { ok: false, reason: "chain must be polygon or base" };
  }

  const txHash = normalizeTxHash(record.txHash);
  if (!txHash.ok) {
    return { ok: false, reason: txHash.reason };
  }

  const logIndex = parseNonNegativeInt(record.logIndex, "log index");
  if (!logIndex.ok) {
    return { ok: false, reason: logIndex.reason };
  }

  const blockNumber = parseNonNegativeInt(record.blockNumber, "block number");
  if (!blockNumber.ok) {
    return { ok: false, reason: blockNumber.reason };
  }

  const fromAddress = normalizeHexAddress(record.fromAddress, "from address");
  if (!fromAddress.ok) {
    return { ok: false, reason: fromAddress.reason };
  }

  const toAddress = normalizeHexAddress(record.toAddress, "to address");
  if (!toAddress.ok) {
    return { ok: false, reason: toAddress.reason };
  }

  const tokenAddress = normalizeHexAddress(
    record.tokenAddress,
    "token address",
  );
  if (!tokenAddress.ok) {
    return { ok: false, reason: tokenAddress.reason };
  }

  const amount = parseUsdtAmount(record.amount);
  if (!amount.ok) {
    return { ok: false, reason: amount.reason };
  }
  if (amount.amount <= 0) {
    return { ok: false, reason: "usdt amount must be greater than 0" };
  }

  return {
    ok: true,
    event: {
      chain: record.chain,
      txHash: txHash.txHash,
      logIndex: logIndex.value,
      fromAddress: fromAddress.address,
      toAddress: toAddress.address,
      tokenAddress: tokenAddress.address,
      amount: amount.amount,
      blockNumber: blockNumber.value,
    },
  };
}

export async function ingestDeposit(
  event: DepositEvent,
) : Promise<
  | { ok: true; result: IngestDepositResult }
  | { ok: false; reason: string; status: number }
> {
  const token = await loadActiveUsdtToken(event.chain);
  if (!token.ok) {
    return { ok: false, reason: token.reason, status: 409 };
  }
  if (token.contractAddress !== event.tokenAddress) {
    return {
      ok: false,
      reason: "token is not the configured usdt",
      status: 409,
    };
  }

  const treasury = await loadActiveTreasury(event.chain);
  if (!treasury.ok) {
    return { ok: false, reason: treasury.reason, status: 409 };
  }
  if (treasury.address !== event.toAddress) {
    return { ok: false, reason: "deposit is not to treasury", status: 409 };
  }

  const stored = await storeDeposit(event);
  if (!stored.ok) {
    return stored;
  }

  const resumed = await resumeIfClaimed(stored.deposit);
  if (!resumed.ok) {
    return resumed;
  }
  if (resumed.result) {
    return {
      ok: true,
      result: { ...resumed.result, replay: stored.replay },
    };
  }

  const applied = await applyFreshMatch(event, stored.deposit.id);
  if (!applied.ok) {
    return applied;
  }

  return {
    ok: true,
    result: {
      depositId: stored.deposit.id,
      replay: stored.replay,
      ...applied.result,
    },
  };
}

async function storeDeposit(
  event: DepositEvent,
) : Promise<
  | { ok: true; deposit: ChainDepositRow; replay: boolean }
  | { ok: false; reason: string; status: number }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chain_deposits")
    .insert({
      chain_id: event.chain,
      tx_hash: event.txHash,
      log_index: event.logIndex,
      from_address: event.fromAddress,
      to_address: event.toAddress,
      token_address: event.tokenAddress,
      amount: event.amount,
      block_number: event.blockNumber,
    })
    .select()
    .maybeSingle();

  if (!error && data) {
    return { ok: true, deposit: data, replay: false };
  }

  if (error?.code !== UNIQUE_VIOLATION) {
    return { ok: false, reason: "unable to ingest deposit", status: 503 };
  }

  const existing = await supabase
    .from("chain_deposits")
    .select()
    .eq("chain_id", event.chain)
    .eq("tx_hash", event.txHash)
    .eq("log_index", event.logIndex)
    .maybeSingle();

  if (existing.error || !existing.data) {
    return { ok: false, reason: "unable to ingest deposit", status: 503 };
  }

  return { ok: true, deposit: existing.data, replay: true };
}

async function resumeIfClaimed(deposit: ChainDepositRow): Promise<
  | {
      ok: true;
      result: Omit<IngestDepositResult, "replay"> | null;
    }
  | { ok: false; reason: string; status: number }
> {
  const supabase = createAdminClient();

  const linked = await supabase
    .from("intent_deposits")
    .select("intent_id")
    .eq("deposit_id", deposit.id)
    .maybeSingle();

  if (linked.error) {
    return { ok: false, reason: "unable to ingest deposit", status: 503 };
  }

  const intentId =
    linked.data?.intent_id ?? (await findClaimedIntentId(deposit));
  if (!intentId) {
    return { ok: true, result: null };
  }

  const finished = await finishCredit(intentId, deposit);
  if (!finished.ok) {
    return finished;
  }

  return {
    ok: true,
    result: {
      depositId: deposit.id,
      outcome: "credited",
      intentIds: [intentId],
    },
  };
}

async function findClaimedIntentId(
  deposit: ChainDepositRow,
) : Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .select("id")
    .eq("chain_id", deposit.chain_id)
    .eq("deposit_tx", deposit.tx_hash);

  if (error || data?.length !== 1) {
    return null;
  }

  return data[0].id;
}

async function applyFreshMatch(
  event: DepositEvent,
  depositId: string,
) : Promise<
  | {
      ok: true;
      result: { outcome: IngestDepositResult["outcome"]; intentIds: string[] };
    }
  | { ok: false; reason: string; status: number }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .select()
    .eq("chain_id", event.chain)
    .eq("status", "awaiting_payment");

  if (error) {
    return { ok: false, reason: "unable to ingest deposit", status: 503 };
  }

  const match = matchDeposit(event, toMatchable(data ?? []));

  if (match.outcome === "credited") {
    const credited = await claimAndCredit(match.intentId, event, depositId);
    if (!credited.ok) {
      return credited;
    }
    if (!credited.claimed) {
      return { ok: true, result: { outcome: "unmatched", intentIds: [] } };
    }
    return {
      ok: true,
      result: { outcome: "credited", intentIds: [match.intentId] },
    };
  }

  if (match.outcome === "manual_review" || match.outcome === "expired") {
    const moved = await moveIntents(
      match.intentIds,
      match.outcome === "expired" ? "expired" : "manual_review",
    );
    if (!moved.ok) {
      return moved;
    }
    return {
      ok: true,
      result: { outcome: match.outcome, intentIds: match.intentIds },
    };
  }

  return { ok: true, result: { outcome: "unmatched", intentIds: [] } };
}

async function claimAndCredit(
  intentId: string,
  event: DepositEvent,
  depositId: string,
) : Promise<
  { ok: true; claimed: boolean } | { ok: false; reason: string; status: number }
> {
  const detected = transitionStatus("awaiting_payment", "detected");
  const credited = transitionStatus("detected", "credited");
  if (!detected.ok || !credited.ok) {
    return {
      ok: false,
      reason: "unable to credit payment intent",
      status: 503,
    };
  }

  const supabase = createAdminClient();
  const claimed = await supabase
    .from("payment_intents")
    .update({
      status: "detected",
      deposit_tx: event.txHash,
    })
    .eq("id", intentId)
    .eq("status", "awaiting_payment")
    .select("id")
    .maybeSingle();

  if (claimed.error) {
    return {
      ok: false,
      reason: "unable to credit payment intent",
      status: 503,
    };
  }
  if (!claimed.data) {
    return { ok: true, claimed: false };
  }

  const finished = await finishCredit(intentId, {
    id: depositId,
    tx_hash: event.txHash,
  });
  if (!finished.ok) {
    return finished;
  }

  return { ok: true, claimed: true };
}

async function finishCredit(
  intentId: string,
  deposit: Pick<ChainDepositRow, "id" | "tx_hash">,
) : Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  const supabase = createAdminClient();
  const current = await supabase
    .from("payment_intents")
    .select()
    .eq("id", intentId)
    .maybeSingle();

  if (current.error || !current.data) {
    return {
      ok: false,
      reason: "unable to credit payment intent",
      status: 503,
    };
  }

  if (current.data.deposit_tx !== deposit.tx_hash) {
    return {
      ok: false,
      reason: "unable to credit payment intent",
      status: 409,
    };
  }

  if (current.data.status === "detected") {
    const credited = transitionStatus("detected", "credited");
    if (!credited.ok) {
      return { ok: false, reason: credited.reason, status: 503 };
    }

    const updated = await supabase
      .from("payment_intents")
      .update({ status: "credited" })
      .eq("id", intentId)
      .eq("status", "detected")
      .eq("deposit_tx", deposit.tx_hash)
      .select("id")
      .maybeSingle();

    if (updated.error || !updated.data) {
      return {
        ok: false,
        reason: "unable to credit payment intent",
        status: 503,
      };
    }
  } else if (current.data.status !== "credited") {
    return {
      ok: false,
      reason: "unable to credit payment intent",
      status: 409,
    };
  }

  const linked = await supabase.from("intent_deposits").insert({
    intent_id: intentId,
    deposit_id: deposit.id,
  });

  if (linked.error && linked.error.code !== UNIQUE_VIOLATION) {
    return {
      ok: false,
      reason: "unable to credit payment intent",
      status: 503,
    };
  }

  return { ok: true };
}

async function moveIntents(
  intentIds: string[],
  to: "manual_review" | "expired",
) : Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  const moved = transitionStatus("awaiting_payment", to);
  if (!moved.ok) {
    return { ok: false, reason: moved.reason, status: 503 };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("payment_intents")
    .update({ status: to })
    .in("id", intentIds)
    .eq("status", "awaiting_payment");

  if (error) {
    return { ok: false, reason: "unable to ingest deposit", status: 503 };
  }

  return { ok: true };
}

function toMatchable(rows: PaymentIntentRow[]): MatchableIntent[] {
  const intents: MatchableIntent[] = [];
  for (const row of rows) {
    const intent = toPaymentIntent(row);
    if (!intent) {
      continue;
    }
    intents.push({
      id: intent.id,
      status: intent.status,
      chain: intent.chain,
      treasuryAddress: intent.treasuryAddress,
      usdtAmount: intent.usdtAmount,
      expiresAt: intent.expiresAt,
    });
  }
  return intents;
}
