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
  });

  it("includes http status and sanitized rpc detail", () => {
    expect(rpcClientReason({ httpStatus: 503 })).toBe(
      "chain rpc is unavailable (http 503)",
    );
    expect(
      rpcClientReason({
        rpcMessage: "upstream failed https://secret.example/key",
      }),
    ).toBe("chain rpc is unavailable (upstream failed [url])");
    expect(rpcClientReason({})).toBe("chain rpc is unavailable");
  });
});
