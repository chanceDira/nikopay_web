import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

import { recoverPersonalSigner } from "@/lib/eth-personal";
import { getSettlementIngestSecret } from "@/lib/supabase/env";
import { loadActiveTreasuryAddresses } from "@/lib/treasury";

export const ADMIN_COOKIE = "nikopay_admin";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_SEC = 12 * 60 * 60;
const MESSAGE_HEAD = "NikoPay admin\nSign this to open the ops console.\n";

export function getAdminHmacSecret(): string | null {
  return getSettlementIngestSecret();
}

export function buildAdminChallenge(
  secret: string,
  now = Date.now(),
): string {
  return `${MESSAGE_HEAD}${now}.${hmacHex(secret, String(now))}`;
}

export function parseAdminChallenge(
  message: string,
  secret: string,
  now = Date.now(),
): { ok: true } | { ok: false; reason: string } {
  if (!message.startsWith(MESSAGE_HEAD)) {
    return { ok: false, reason: "challenge is invalid" };
  }

  const stamp = message.slice(MESSAGE_HEAD.length);
  const sep = stamp.indexOf(".");
  if (sep <= 0) {
    return { ok: false, reason: "challenge is invalid" };
  }

  const issuedRaw = stamp.slice(0, sep);
  const mac = stamp.slice(sep + 1);
  const issuedAt = Number(issuedRaw);
  if (!Number.isInteger(issuedAt) || issuedAt <= 0) {
    return { ok: false, reason: "challenge is invalid" };
  }
  if (now - issuedAt > CHALLENGE_TTL_MS || issuedAt > now + 30_000) {
    return { ok: false, reason: "challenge expired" };
  }

  const expected = hmacHex(secret, issuedRaw);
  if (!safeEqualUtf8(mac, expected)) {
    return { ok: false, reason: "challenge is invalid" };
  }

  return { ok: true };
}

export function createAdminCookieValue(
  address: string,
  secret: string,
  now = Date.now(),
): string {
  const expiresAt = now + SESSION_TTL_SEC * 1000;
  const payload = `${address}.${expiresAt}`;
  return `${payload}.${hmacHex(secret, payload)}`;
}

export function readAdminCookieAddress(
  cookieHeader: string | null,
  secret: string,
  now = Date.now(),
): string | null {
  const raw = cookieValue(cookieHeader, ADMIN_COOKIE);
  if (!raw) {
    return null;
  }

  const lastDot = raw.lastIndexOf(".");
  if (lastDot <= 0) {
    return null;
  }

  const payload = raw.slice(0, lastDot);
  const mac = raw.slice(lastDot + 1);
  if (!safeEqualUtf8(mac, hmacHex(secret, payload))) {
    return null;
  }

  const sep = payload.lastIndexOf(".");
  if (sep <= 0) {
    return null;
  }

  const address = payload.slice(0, sep).toLowerCase();
  const expiresAt = Number(payload.slice(sep + 1));
  if (!address.startsWith("0x") || address.length !== 42) {
    return null;
  }
  if (!Number.isInteger(expiresAt) || expiresAt <= now) {
    return null;
  }

  return address;
}

export function applyAdminCookie(
  response: NextResponse,
  value: string,
  maxAge = SESSION_TTL_SEC,
): void {
  response.cookies.set({
    name: ADMIN_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export function clearAdminCookie(response: NextResponse): void {
  applyAdminCookie(response, "", 0);
}

export async function authorizeAdmin(
  request: Request,
): Promise<
  | { ok: true; address: string }
  | { ok: false; reason: string; status: number }
> {
  const secret = getAdminHmacSecret();
  if (!secret) {
    return { ok: false, reason: "admin is not configured", status: 503 };
  }

  const address = readAdminCookieAddress(
    request.headers.get("cookie"),
    secret,
  );
  if (!address) {
    return { ok: false, reason: "unauthorized", status: 401 };
  }

  const treasuries = await loadActiveTreasuryAddresses();
  if (!treasuries.ok) {
    return { ok: false, reason: treasuries.reason, status: 503 };
  }
  if (!treasuries.addresses.includes(address)) {
    return { ok: false, reason: "unauthorized", status: 401 };
  }

  return { ok: true, address };
}

export function recoverTreasurySigner(
  message: string,
  signature: unknown,
): { ok: true; address: string } | { ok: false; reason: string } {
  if (typeof signature !== "string") {
    return { ok: false, reason: "signature is required" };
  }
  if (typeof message !== "string" || message.length === 0) {
    return { ok: false, reason: "challenge is invalid" };
  }
  return recoverPersonalSigner(message, signature);
}

function hmacHex(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqualUtf8(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function cookieValue(header: string | null, name: string): string | null {
  if (!header) {
    return null;
  }

  for (const part of header.split(";")) {
    const sep = part.indexOf("=");
    if (sep <= 0) {
      continue;
    }
    const key = part.slice(0, sep).trim();
    if (key === name) {
      return part.slice(sep + 1).trim();
    }
  }

  return null;
}
