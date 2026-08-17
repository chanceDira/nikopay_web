import { createHash, timingSafeEqual } from "node:crypto";

import { getSettlementIngestSecret } from "@/lib/supabase/env";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function authorizeIngest(request: Request):
  | {
      ok: true;
    }
  | { ok: false; reason: string; status: number } {
  const expected = getSettlementIngestSecret();
  if (!expected) {
    return { ok: false, reason: "ingest is not configured", status: 503 };
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return { ok: false, reason: "unauthorized", status: 401 };
  }

  const provided = header.slice("Bearer ".length).trim();
  if (!provided) {
    return { ok: false, reason: "unauthorized", status: 401 };
  }

  const matches = timingSafeEqual(sha256(provided), sha256(expected));
  if (!matches) {
    return { ok: false, reason: "unauthorized", status: 401 };
  }

  return { ok: true };
}
