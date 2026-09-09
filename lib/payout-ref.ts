export function payoutRefAlias(momoRef: string | null | undefined): {
  payoutRef?: string;
  momoRef?: string;
} {
  const value = momoRef || undefined;
  if (!value) {
    return {};
  }
  return { payoutRef: value, momoRef: value };
}

export function displayPayoutRef(intent: {
  payoutRef?: string;
  momoRef?: string;
}): string | undefined {
  return intent.payoutRef ?? intent.momoRef;
}

export function parsePayoutRefPatch(
  body: Record<string, unknown>,
):
  | { ok: true; skip: true }
  | { ok: true; skip: false; value: string | null }
  | { ok: false; reason: string } {
  const hasPayoutRef = body.payoutRef !== undefined;
  const hasMomoRef = body.momoRef !== undefined;
  if (!hasPayoutRef && !hasMomoRef) {
    return { ok: true, skip: true };
  }

  const raw = hasPayoutRef ? body.payoutRef : body.momoRef;
  if (raw === null || raw === "") {
    return { ok: true, skip: false, value: null };
  }
  if (typeof raw !== "string") {
    return { ok: false, reason: "payout ref must be a string" };
  }
  return { ok: true, skip: false, value: raw };
}
