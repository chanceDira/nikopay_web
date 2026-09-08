export function isOpenPayoutStatus(status: string): boolean {
  return status === "pending" || status === "enqueued";
}

export function isTerminalPayoutStatus(status: string): boolean {
  return status === "successful" || status === "failed";
}

export function reusablePayoutId(
  row: { status: string; payout_id: string } | null,
): string | null {
  if (row && isOpenPayoutStatus(row.status)) {
    return row.payout_id;
  }
  return null;
}

export function shouldStartPayout(input: {
  intentStatus: string;
  latestPayoutStatus: string | null;
}): boolean {
  if (input.latestPayoutStatus === "successful") {
    return false;
  }
  if (input.intentStatus === "credited") {
    return true;
  }
  if (input.intentStatus === "payout_pending") {
    return (
      input.latestPayoutStatus === null || input.latestPayoutStatus === "failed"
    );
  }
  return false;
}
