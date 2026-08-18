import {
  getInjectedProvider,
  requestAccounts,
  signPersonalMessage,
  type WalletKind,
} from "@/lib/wallet/browser";

export async function proveTreasuryAdmin(
  kind: WalletKind,
): Promise<{ ok: true; address: string } | { ok: false; reason: string }> {
  const challenge = await fetch("/api/admin/challenge");
  const challengeBody = (await challenge.json()) as {
    data?: { message?: string; treasuries?: string[] };
    error?: string;
  };
  if (!challenge.ok || typeof challengeBody.data?.message !== "string") {
    return {
      ok: false,
      reason: challengeBody.error ?? "unable to start admin session",
    };
  }

  const found = getInjectedProvider(kind);
  if (!found.ok) {
    return found;
  }

  const account = await requestAccounts(found.provider);
  if (!account.ok) {
    return account;
  }

  const treasuries = (challengeBody.data.treasuries ?? []).map((item) =>
    item.toLowerCase(),
  );
  if (treasuries.length > 0 && !treasuries.includes(account.address)) {
    return { ok: false, reason: "connected wallet is not the treasury" };
  }

  const signed = await signPersonalMessage(
    found.provider,
    account.address,
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
