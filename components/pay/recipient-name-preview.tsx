"use client";

type RecipientNamePreviewCardProps = {
  status: "idle" | "loading" | "found" | "not_found" | "unavailable";
  displayName: string | null;
  providerLabel: string;
};

export function RecipientNamePreviewCard({
  status,
  displayName,
  providerLabel,
}: RecipientNamePreviewCardProps) {
  if (status === "idle") {
    return null;
  }

  if (status === "loading") {
    return (
      <div className="mt-3 p-3 rounded-lg bg-niko-surface/80 border border-niko-border/40">
        <p className="text-xs text-niko-muted">Looking up recipient name…</p>
      </div>
    );
  }

  if (status === "found" && displayName) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-niko-surface/80 border border-niko-teal/30">
        <p className="text-xs text-niko-muted">Recipient name</p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {displayName}
        </p>
        <p className="mt-1 text-[11px] text-niko-muted">
          Confirm this is who you mean to pay. Names come from {providerLabel}.
        </p>
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div className="mt-3 p-3 rounded-lg border border-[var(--niko-warning-border)] bg-[var(--niko-warning-bg)]">
        <p className="text-xs font-medium text-[var(--niko-warning-text)]">
          No registered name found for this number
        </p>
        <p className="mt-1 text-[11px] text-[var(--niko-warning-text)]">
          Double-check the digits before you continue. We cannot reverse a
          completed payout.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-lg bg-niko-surface/80 border border-niko-border/40">
      <p className="text-xs text-niko-muted">
        Name preview is not available for this provider yet. Check the number
        carefully before you pay.
      </p>
    </div>
  );
}
