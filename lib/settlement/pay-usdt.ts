const PAY_USDT_SCALE = 1_000_000;
const MAX_PAY_STEPS = 100_000;

export const PAY_USDT_DECIMALS = 6;

export function toPayUsdtUnits(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round(value * PAY_USDT_SCALE);
}

export function fromPayUsdtUnits(units: number): number {
  return units / PAY_USDT_SCALE;
}

export function equalPayUsdt(left: number, right: number): boolean {
  const leftUnits = toPayUsdtUnits(left);
  const rightUnits = toPayUsdtUnits(right);
  return leftUnits !== null && rightUnits !== null && leftUnits === rightUnits;
}

export function allocatePayUsdt(
  quotedAmount: number,
  takenAmounts: readonly number[],
): { ok: true; payUsdt: number } | { ok: false; reason: string } {
  const start = toPayUsdtUnits(quotedAmount);
  if (start == null) {
    return { ok: false, reason: "usdt amount is invalid" };
  }

  const taken = new Set<number>();
  for (const amount of takenAmounts) {
    const units = toPayUsdtUnits(amount);
    if (units != null) {
      taken.add(units);
    }
  }

  for (let step = 0; step <= MAX_PAY_STEPS; step += 1) {
    const units = start + step;
    if (!taken.has(units)) {
      return { ok: true, payUsdt: fromPayUsdtUnits(units) };
    }
  }

  return { ok: false, reason: "too many open payments at this amount" };
}
