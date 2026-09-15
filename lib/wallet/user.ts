import {
  getInjectedProvider,
  requestAccounts,
  signPersonalMessage,
  type EthereumProvider,
  type WalletKind,
} from "@/lib/wallet/browser";
import { connectWalletConnect } from "@/lib/wallet/walletconnect";

export async function readWalletSession(): Promise<
  { ok: true; address: string } | { ok: false; reason: string }
> {
  const session = await fetch("/api/wallet/session");
  const body = (await session.json()) as {
    data?: { address?: string };
    error?: string;
  };
  if (!session.ok || typeof body.data?.address !== "string") {
    return { ok: false, reason: body.error ?? "unauthorized" };
  }
  return { ok: true, address: body.data.address };
}

export async function clearWalletSession(): Promise<void> {
  await fetch("/api/wallet/session", { method: "DELETE" });
}

export async function proveUserWallet(
  kind: WalletKind,
): Promise<{ ok: true; address: string } | { ok: false; reason: string }> {
  const challenge = await fetch("/api/wallet/challenge");
  const challengeBody = (await challenge.json()) as {
    data?: { message?: string };
    error?: string;
  };
  if (!challenge.ok || typeof challengeBody.data?.message !== "string") {
    return {
      ok: false,
      reason: challengeBody.error ?? "unable to start wallet session",
    };
  }

  const providerResult = await resolveUserProvider(kind);
  if (!providerResult.ok) {
    return providerResult;
  }

  const account = await requestAccounts(providerResult.provider);
  if (!account.ok) {
    return account;
  }

  const signed = await signPersonalMessage(
    providerResult.provider,
    account.address,
    challengeBody.data.message,
  );
  if (!signed.ok) {
    return signed;
  }

  const session = await fetch("/api/wallet/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: challengeBody.data.message,
      signature: signed.signature,
    }),
  });
  const sessionBody = (await session.json()) as {
    data?: { address?: string };
    error?: string;
  };
  if (!session.ok || typeof sessionBody.data?.address !== "string") {
    return {
      ok: false,
      reason: sessionBody.error ?? "unable to start wallet session",
    };
  }

  return { ok: true, address: sessionBody.data.address };
}

export async function ensureWalletSession(
  kind: WalletKind,
): Promise<{ ok: true; address: string } | { ok: false; reason: string }> {
  const existing = await readWalletSession();
  if (existing.ok) {
    return existing;
  }
  return proveUserWallet(kind);
}

async function resolveUserProvider(
  kind: WalletKind,
): Promise<
  { ok: true; provider: EthereumProvider } | { ok: false; reason: string }
> {
  if (kind === "WalletConnect") {
    return connectWalletConnect("base");
  }
  return getInjectedProvider(kind);
}
