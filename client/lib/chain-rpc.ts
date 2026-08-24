import type { ChainId } from "@/lib/settlement/types";

const DEFAULT_RPC: Record<ChainId, string> = {
  base: "https://sepolia.base.org",
  polygon: "https://rpc-amoy.polygon.technology",
};

export function getChainRpcUrl(chain: ChainId): string {
  if (chain === "base") {
    return process.env.CHAIN_RPC_URL_BASE?.trim() || DEFAULT_RPC.base;
  }

  return process.env.CHAIN_RPC_URL_POLYGON?.trim() || DEFAULT_RPC.polygon;
}

export function toRpcHex(value: number): string {
  return `0x${value.toString(16)}`;
}

type RpcResponse<T> = {
  result?: T;
  error?: { message?: string };
};

export function rpcClientReason(input: {
  timedOut?: boolean;
  httpStatus?: number;
  rpcMessage?: string;
}): string {
  if (input.timedOut) {
    return "chain rpc timed out";
  }
  if (input.httpStatus === 429) {
    return "chain rpc is rate limited";
  }

  const text = (input.rpcMessage ?? "").toLowerCase();
  if (text.includes("rate") || text.includes("too many")) {
    return "chain rpc is rate limited";
  }
  if (
    text.includes("block range") ||
    text.includes("too large") ||
    text.includes("query exceeds") ||
    text.includes("limited to")
  ) {
    return "chain rpc rejected the log range";
  }

  if (input.httpStatus && input.httpStatus > 0) {
    return `chain rpc is unavailable (http ${input.httpStatus})`;
  }

  const detail = sanitizeRpcDetail(input.rpcMessage);
  if (detail) {
    return `chain rpc is unavailable (${detail})`;
  }

  return "chain rpc is unavailable";
}

/** Keep operator-facing RPC text short and free of credentials. */
function sanitizeRpcDetail(message: string | undefined): string | null {
  if (!message?.trim()) {
    return null;
  }

  const cleaned = message
    .replace(/https?:\/\/[^\s]+/gi, "[url]")
    .replace(/\b[0-9a-f]{8,}(?:-[0-9a-f]{4,})+\b/gi, "[id]")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.length > 96 ? `${cleaned.slice(0, 93)}...` : cleaned;
}

export async function rpcCall<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<{ ok: true; result: T } | { ok: false; reason: string }> {
  const first = await rpcCallOnce<T>(url, method, params);
  if (first.ok) {
    return first;
  }
  return rpcCallOnce<T>(url, method, params);
}

async function rpcCallOnce<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<{ ok: true; result: T } | { ok: false; reason: string }> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    return {
      ok: false,
      reason: rpcClientReason({
        timedOut: name === "TimeoutError" || name === "AbortError",
      }),
    };
  }

  if (!response.ok) {
    let rpcMessage: string | undefined;
    try {
      const body = (await response.json()) as RpcResponse<unknown>;
      rpcMessage =
        typeof body.error?.message === "string"
          ? body.error.message
          : undefined;
    } catch {
      rpcMessage = undefined;
    }
    return {
      ok: false,
      reason: rpcClientReason({
        httpStatus: response.status,
        rpcMessage,
      }),
    };
  }

  let payload: RpcResponse<T>;
  try {
    payload = (await response.json()) as RpcResponse<T>;
  } catch {
    return { ok: false, reason: "chain rpc is unavailable" };
  }

  if (payload.error || payload.result === undefined) {
    return {
      ok: false,
      reason: rpcClientReason({ rpcMessage: payload.error?.message }),
    };
  }

  return { ok: true, result: payload.result };
}

export async function rpcBlockNumber(
  url: string,
): Promise<{ ok: true; head: number } | { ok: false; reason: string }> {
  const result = await rpcCall<string>(url, "eth_blockNumber", []);
  if (!result.ok) {
    return result;
  }

  const head = Number.parseInt(result.result, 16);
  if (!Number.isSafeInteger(head) || head < 0) {
    return { ok: false, reason: "chain rpc is unavailable" };
  }

  return { ok: true, head };
}

export async function rpcGetLogs(
  url: string,
  params: {
    fromBlock: number;
    toBlock: number;
    address: string;
    topics: (string | null)[];
  },
): Promise<{ ok: true; logs: unknown[] } | { ok: false; reason: string }> {
  const result = await rpcCall<unknown[]>(url, "eth_getLogs", [
    {
      fromBlock: toRpcHex(params.fromBlock),
      toBlock: toRpcHex(params.toBlock),
      address: params.address,
      topics: params.topics,
    },
  ]);

  if (!result.ok) {
    return result;
  }

  if (!Array.isArray(result.result)) {
    return { ok: false, reason: "chain rpc is unavailable" };
  }

  return { ok: true, logs: result.result };
}

export async function rpcEthCall(
  url: string,
  to: string,
  data: string,
): Promise<{ ok: true; data: string } | { ok: false; reason: string }> {
  const result = await rpcCall<string>(url, "eth_call", [
    { to, data },
    "latest",
  ]);
  if (!result.ok) {
    return result;
  }

  if (typeof result.result !== "string") {
    return { ok: false, reason: "chain rpc is unavailable" };
  }

  return { ok: true, data: result.result };
}
