import { asRecord, jsonData, jsonError, readJsonBody } from "@/lib/http";
import {
  allowIpRequest,
  clientIp,
  createIpRateLimiter,
} from "@/lib/ip-rate-limit";
import {
  applyWalletCookie,
  authorizeWallet,
  clearWalletCookie,
  createWalletCookieValue,
  getWalletHmacSecret,
  parseWalletChallenge,
  recoverWalletSigner,
} from "@/lib/wallet-auth";

const sessionLimit = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 20,
});

export async function GET(request: Request) {
  const wallet = authorizeWallet(request);
  if (!wallet.ok) {
    return jsonError(wallet.reason, wallet.status);
  }

  return jsonData({ address: wallet.address });
}

export async function POST(request: Request) {
  if (!allowIpRequest(sessionLimit, clientIp(request))) {
    return jsonError("too many requests", 429);
  }

  const secret = getWalletHmacSecret();
  if (!secret) {
    return jsonError("wallet session is not configured", 503);
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError("invalid request body", 400);
  }
  const body = asRecord(parsed.body);
  if (!body) {
    return jsonError("invalid request body", 400);
  }

  if (typeof body.message !== "string") {
    return jsonError("challenge is invalid", 400);
  }

  const challenge = parseWalletChallenge(body.message, secret);
  if (!challenge.ok) {
    return jsonError(challenge.reason, 401);
  }

  const signer = recoverWalletSigner(body.message, body.signature);
  if (!signer.ok) {
    return jsonError(signer.reason, 401);
  }

  const response = jsonData({ address: signer.address });
  applyWalletCookie(response, createWalletCookieValue(signer.address, secret));
  return response;
}

export async function DELETE() {
  const response = jsonData({ ok: true });
  clearWalletCookie(response);
  return response;
}
