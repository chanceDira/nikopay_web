export const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const ADDRESS_TOPIC = /^0x[a-fA-F0-9]{64}$/;
const HEX_QUANTITY = /^0x[a-fA-F0-9]*$/;
const USDT_SCALE = BigInt(100_000_000);
const ZERO = BigInt(0);

export type ParsedTransferLog = {
  txHash: string;
  logIndex: number;
  fromAddress: string;
  toAddress: string;
  tokenAddress: string;
  amount: number;
  blockNumber: number;
};

export function topicForAddress(address: string): string {
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

export function addressFromTopic(
  topic: string,
) : { ok: true; address: string } | { ok: false } {
  if (!ADDRESS_TOPIC.test(topic)) {
    return { ok: false };
  }

  return { ok: true, address: `0x${topic.slice(26).toLowerCase()}` };
}

export function parseRpcQuantity(
  value: unknown,
) : { ok: true; value: number } | { ok: false } {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return { ok: true, value };
  }

  if (typeof value !== "string" || !HEX_QUANTITY.test(value)) {
    return { ok: false };
  }

  const parsed = value === "0x" ? 0 : Number.parseInt(value, 16);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return { ok: false };
  }

  return { ok: true, value: parsed };
}

export function rawTokenToUsdt(data: string, decimals: number): number | null {
  if (!HEX_QUANTITY.test(data) || decimals < 0 || decimals > 36) {
    return null;
  }

  const raw = data === "0x" ? ZERO : BigInt(data);
  if (raw <= ZERO) {
    return null;
  }

  const scale = BigInt(10) ** BigInt(decimals);
  const units = (raw * USDT_SCALE) / scale;
  if (units <= ZERO || units > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }

  return Number(units) / Number(USDT_SCALE);
}

export function parseTransferLog(
  log: {
    address?: unknown;
    topics?: unknown;
    data?: unknown;
    transactionHash?: unknown;
    logIndex?: unknown;
    blockNumber?: unknown;
    removed?: unknown;
  },
  decimals: number,
) : ParsedTransferLog | null {
  if (log.removed === true) {
    return null;
  }

  if (typeof log.address !== "string" || typeof log.data !== "string") {
    return null;
  }

  if (typeof log.transactionHash !== "string") {
    return null;
  }

  if (!Array.isArray(log.topics) || log.topics.length < 3) {
    return null;
  }

  const [topic0, topicFrom, topicTo] = log.topics;
  if (typeof topic0 !== "string" || topic0.toLowerCase() !== TRANSFER_TOPIC) {
    return null;
  }
  if (typeof topicFrom !== "string" || typeof topicTo !== "string") {
    return null;
  }

  const fromAddress = addressFromTopic(topicFrom);
  const toAddress = addressFromTopic(topicTo);
  if (!fromAddress.ok || !toAddress.ok) {
    return null;
  }

  const token = log.address.trim().toLowerCase();
  if (!token.startsWith("0x") || token.length !== 42) {
    return null;
  }

  const amount = rawTokenToUsdt(log.data, decimals);
  if (amount === null) {
    return null;
  }

  const logIndex = parseRpcQuantity(log.logIndex);
  const blockNumber = parseRpcQuantity(log.blockNumber);
  if (!logIndex.ok || !blockNumber.ok) {
    return null;
  }

  const txHash = log.transactionHash.trim().toLowerCase();
  if (!txHash.startsWith("0x") || txHash.length !== 66) {
    return null;
  }

  return {
    txHash,
    logIndex: logIndex.value,
    fromAddress: fromAddress.address,
    toAddress: toAddress.address,
    tokenAddress: token,
    amount,
    blockNumber: blockNumber.value,
  };
}

export function confirmedHead(head: number, confirmBlocks: number): number {
  return Math.max(0, head - confirmBlocks);
}

export function nextScanRange(input: {
  lastBlock: number;
  confirmedHead: number;
  maxSpan: number;
}) : { fromBlock: number; toBlock: number } | null {
  const fromBlock = input.lastBlock + 1;
  if (fromBlock > input.confirmedHead) {
    return null;
  }

  const toBlock = Math.min(input.confirmedHead, fromBlock + input.maxSpan - 1);
  return { fromBlock, toBlock };
}
