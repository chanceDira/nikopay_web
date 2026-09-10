export type SettlementTiming = {
  detectedAt?: string;
  creditedAt?: string;
  payoutStartedAt?: string;
  paidAt?: string;
};

export type SettlementDurations = {
  usdtToPaidMicros: number | null;
  disburseMicros: number | null;
};

const ISO_PARTS =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/;

export function isoToUnixMicros(iso: string): number | null {
  const match = iso.trim().match(ISO_PARTS);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const ms = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!Number.isFinite(ms)) {
    return null;
  }

  const frac = (match[7] ?? "").padEnd(6, "0").slice(0, 6);
  return ms * 1000 + Number(frac);
}

export function formatClockUtc(iso: string): string {
  const match = iso.trim().match(ISO_PARTS);
  if (!match) {
    return iso;
  }

  const frac = (match[7] ?? "").padEnd(6, "0").slice(0, 6);
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}.${frac} UTC`;
}

export function formatDurationMicros(micros: number): string {
  if (!Number.isFinite(micros) || micros < 0) {
    return "-";
  }
  if (micros < 1000) {
    return `${Math.round(micros)}µs`;
  }
  if (micros < 1_000_000) {
    return `${(micros / 1000).toFixed(3)}ms`;
  }
  return `${(micros / 1_000_000).toFixed(3)}s`;
}

export function settlementDurations(
  timing: SettlementTiming,
): SettlementDurations {
  const paid = timing.paidAt ? isoToUnixMicros(timing.paidAt) : null;
  const usdtStart = isoToUnixMicros(
    timing.detectedAt ?? timing.creditedAt ?? "",
  );
  const disburseStart = isoToUnixMicros(
    timing.payoutStartedAt ?? timing.creditedAt ?? "",
  );

  return {
    usdtToPaidMicros:
      paid != null && usdtStart != null ? paid - usdtStart : null,
    disburseMicros:
      paid != null && disburseStart != null ? paid - disburseStart : null,
  };
}

export function settlementTimingLines(timing: SettlementTiming): string[] {
  const durations = settlementDurations(timing);
  const lines: string[] = [];

  if (timing.detectedAt) {
    lines.push(`USDT seen: ${formatClockUtc(timing.detectedAt)}`);
  }
  if (timing.creditedAt) {
    lines.push(`Deposit credited: ${formatClockUtc(timing.creditedAt)}`);
  }
  if (timing.payoutStartedAt) {
    lines.push(`Payout sent: ${formatClockUtc(timing.payoutStartedAt)}`);
  }
  if (timing.paidAt) {
    lines.push(`Settled: ${formatClockUtc(timing.paidAt)}`);
  }
  if (durations.usdtToPaidMicros != null) {
    lines.push(
      `USDT to paid: ${formatDurationMicros(durations.usdtToPaidMicros)}`,
    );
  }
  if (durations.disburseMicros != null) {
    lines.push(
      `Local disbursement: ${formatDurationMicros(durations.disburseMicros)}`,
    );
  }

  return lines;
}

export function logSettlementTiming(
  intentId: string,
  timing: SettlementTiming,
): void {
  const durations = settlementDurations(timing);
  if (durations.usdtToPaidMicros == null && durations.disburseMicros == null) {
    return;
  }

  console.info(
    JSON.stringify({
      event: "settlement.timing",
      intentId,
      usdtToPaidMicros: durations.usdtToPaidMicros,
      disburseMicros: durations.disburseMicros,
    }),
  );
}

export function optionalIso(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}
