import { describe, expect, it } from "vitest";
import { rpcClientReason } from "@/lib/chain-rpc";

describe("rpcClientReason", () => {
  it("maps timeouts and rate limits", () => {
    expect(rpcClientReason({ timedOut: true })).toBe("chain rpc timed out");
    expect(rpcClientReason({ httpStatus: 429 })).toBe(
      "chain rpc is rate limited",
    );
    expect(rpcClientReason({ rpcMessage: "query exceeds max results" })).toBe(
      "chain rpc rejected the log range",
    );
    expect(rpcClientReason({})).toBe("chain rpc is unavailable");
  });
});
