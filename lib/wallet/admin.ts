import {
  getInjectedProvider,
  signPersonalMessage,
  type WalletKind,
} from "@/lib/wallet/browser";
import { connectInjectedWallet } from "@/lib/wallet/offramp";

export async function proveTreasuryAdmin(
  kind: WalletKind,
): Promise<{ ok: true; address: string } | { ok: false; reason: string }> {
  const connected = await connectInjectedWallet(kind, "base");
  if (!connected.ok) {
    return connected;
  }

  const found = getInjectedProvider(kind);
  if (!found.ok) {
    return found;
  }

  const challenge = await fetch("/api/admin/challenge");
  const challengeBody = (await challenge.json()) as {
    data?: { message?: string };
    error?: string;
  };
  if (!challenge.ok || typeof challengeBody.data?.message !== "string") {
    return {
      ok: false,
      reason: challengeBody.error ?? "unable to start admin session",
    };
  }

  const signed = await signPersonalMessage(
    found.provider,
    connected.address,
    challengeBody.data.message,
  );
  if (!signed.ok) {
    return signed;
  }

  const session = await fetch("/api/admin/session", {
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
      reason: sessionBody.error ?? "unable to start admin session",
    };
  }

  return { ok: true, address: sessionBody.data.address };
}
