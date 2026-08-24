export const ADMIN_ACCESS_REASONS = [
  "access_denied",
  "wallet_changed",
  "session_ended",
] as const;

export type AdminAccessReason = (typeof ADMIN_ACCESS_REASONS)[number];

export function isAdminAccessReason(
  value: string | null | undefined,
): value is AdminAccessReason {
  return (
    typeof value === "string" &&
    (ADMIN_ACCESS_REASONS as readonly string[]).includes(value)
  );
}

export function adminAccessMessage(reason: AdminAccessReason): string {
  switch (reason) {
    case "wallet_changed":
      return "Wallet changed. Sign in again with an active treasury wallet.";
    case "session_ended":
      return "Admin session ended. Sign in again with an active treasury wallet.";
    case "access_denied":
    default:
      return "Admin access required. Connect an active treasury wallet.";
  }
}

export function adminLoginPath(reason: AdminAccessReason): string {
  return `/admin/login?error=${reason}`;
}

export async function revokeAdminSession(): Promise<void> {
  try {
    await fetch("/api/admin/session", {
      method: "DELETE",
      credentials: "same-origin",
    });
  } catch {
    // Best-effort logout; caller still redirects.
  }
}
