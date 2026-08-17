import { NextResponse } from "next/server";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function jsonData<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false };
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function parseUsdtAmount(
  value: unknown,
): { ok: true; amount: number } | { ok: false; reason: string } {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, reason: "usdt amount must be a number" };
  }
  return { ok: true, amount: value };
}

export function parseNonNegativeInt(
  value: unknown,
  field: string,
): { ok: true; value: number } | { ok: false; reason: string } {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return { ok: false, reason: `${field} must be a non-negative integer` };
  }
  return { ok: true, value };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
