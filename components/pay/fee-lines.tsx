import { formatLocalAmount } from "@/lib/rates";

type FeeLinesProps = {
  currency: string;
  feePercent: number;
  feeLocal: number;
  netLocal: number;
  pawapayPercent?: number;
  pawapayFeeLocal?: number;
  mnoFeeLocal?: number;
  nikopayFeeLocal?: number;
};

export function FeeLines({
  currency,
  feePercent,
  feeLocal,
  netLocal,
  pawapayPercent,
  pawapayFeeLocal,
  mnoFeeLocal,
  nikopayFeeLocal,
}: FeeLinesProps) {
  const stacked =
    pawapayFeeLocal != null && mnoFeeLocal != null && nikopayFeeLocal != null;

  if (!stacked) {
    return (
      <>
        <div className="text-niko-muted">NikoPay fee ({feePercent}%)</div>
        <div className="font-mono text-right text-niko-muted">
          {formatLocalAmount(feeLocal, currency)}
        </div>
        <div className="font-semibold text-foreground">Recipient receives</div>
        <div className="font-mono font-bold text-right text-niko-teal-bright">
          {formatLocalAmount(netLocal, currency)}
        </div>
      </>
    );
  }

  return (
    <>
      {pawapayFeeLocal > 0 ? (
        <>
          <div className="text-niko-muted">
            PawaPay fee
            {pawapayPercent != null ? ` (${pawapayPercent}%)` : ""}
          </div>
          <div className="font-mono text-right text-niko-muted">
            {formatLocalAmount(pawapayFeeLocal, currency)}
          </div>
        </>
      ) : null}
      {mnoFeeLocal > 0 ? (
        <>
          <div className="text-niko-muted">Mobile money fee</div>
          <div className="font-mono text-right text-niko-muted">
            {formatLocalAmount(mnoFeeLocal, currency)}
          </div>
        </>
      ) : null}
      <div className="text-niko-muted">NikoPay fee ({feePercent}%)</div>
      <div className="font-mono text-right text-niko-muted">
        {formatLocalAmount(nikopayFeeLocal, currency)}
      </div>
      <div className="font-semibold text-foreground">Recipient receives</div>
      <div className="font-mono font-bold text-right text-niko-teal-bright">
        {formatLocalAmount(netLocal, currency)}
      </div>
    </>
  );
}
