import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN_COOKIE, resolveAdminHmacSecret } from "@/lib/admin-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  const secret = resolveAdminHmacSecret(process.env);
  if (!secret) {
    return redirectToLogin(request);
  }

  const address = await readAdminCookieAddressEdge(
    request.cookies.get(ADMIN_COOKIE)?.value,
    secret,
  );
  if (!address) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest): NextResponse {
  const login = request.nextUrl.clone();
  login.pathname = "/admin/login";
  login.search = "";
  return NextResponse.redirect(login);
}

/** Edge-safe cookie check (Web Crypto HMAC). Matches lib/admin-auth format. */
async function readAdminCookieAddressEdge(
  raw: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<string | null> {
  if (!raw) {
    return null;
  }

  const lastDot = raw.lastIndexOf(".");
  if (lastDot <= 0) {
    return null;
  }

  const payload = raw.slice(0, lastDot);
  const mac = raw.slice(lastDot + 1);
  const expected = await hmacHexEdge(secret, payload);
  if (!safeEqualHex(mac, expected)) {
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

async function hmacHexEdge(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return bufferToHex(sig);
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

function safeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
