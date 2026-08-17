const USDT_SCALE = 100_000_000;

export function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }
  return Number.NaN;
}

export function toUsdtUnits(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * USDT_SCALE);
}

export function equalUsdt(left: number, right: number): boolean {
  const leftUnits = toUsdtUnits(left);
  const rightUnits = toUsdtUnits(right);
  return leftUnits !== null && rightUnits !== null && leftUnits === rightUnits;
}
