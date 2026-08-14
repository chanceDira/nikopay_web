export function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }
  return Number.NaN;
}
