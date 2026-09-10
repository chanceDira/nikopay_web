import {
  formatClockUtc,
  formatDurationMicros,
  settlementDurations,
  type SettlementTiming,
} from "@/lib/settlement/timing";

export function SettlementTimingFields(props: {
  timing: SettlementTiming;
  compact?: boolean;
  customer?: boolean;
}) {
  const { timing, compact, customer } = props;
  const durations = settlementDurations(timing);
  const rows: { label: string; value: string }[] = [];

  if (customer) {
    if (timing.paidAt) {
      rows.push({ label: "Settled", value: formatClockUtc(timing.paidAt) });
    }
    if (durations.usdtToPaidMicros != null) {
      rows.push({
        label: "On-chain settlement",
        value: formatDurationMicros(durations.usdtToPaidMicros),
      });
    }
    if (durations.disburseMicros != null) {
      rows.push({
        label: "Local disbursement",
        value: formatDurationMicros(durations.disburseMicros),
      });
    }
  } else {
    if (timing.detectedAt) {
      rows.push({
        label: "USDT seen",
        value: formatClockUtc(timing.detectedAt),
      });
    }
    if (timing.creditedAt) {
      rows.push({
        label: "Deposit credited",
        value: formatClockUtc(timing.creditedAt),
      });
    }
    if (timing.payoutStartedAt) {
      rows.push({
        label: "Payout sent",
        value: formatClockUtc(timing.payoutStartedAt),
      });
    }
    if (timing.paidAt) {
      rows.push({ label: "Settled", value: formatClockUtc(timing.paidAt) });
    }
    if (durations.usdtToPaidMicros != null) {
      rows.push({
        label: "USDT to paid",
        value: formatDurationMicros(durations.usdtToPaidMicros),
      });
    }
    if (durations.disburseMicros != null) {
      rows.push({
        label: "Local disbursement",
        value: formatDurationMicros(durations.disburseMicros),
      });
    }
  }

  if (rows.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <dl className="space-y-2 text-xs">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4">
            <dt className="text-niko-muted">{row.label}</dt>
            <dd className="font-mono text-right text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-y-3 text-sm font-mono">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-xs text-niko-muted font-sans">{row.label}</dt>
          <dd className="text-foreground text-xs mt-0.5">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
