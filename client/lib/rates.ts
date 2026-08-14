export const MOCK_RATE = {
  usdtToRwf: 1350,
  feePercent: 1.5,
  minUsdt: 10,
} as const;

export function calculatePayout(usdtAmount: number) {
  const grossRwf = usdtAmount * MOCK_RATE.usdtToRwf;
  const feeRwf = grossRwf * (MOCK_RATE.feePercent / 100);
  const netRwf = grossRwf - feeRwf;

  return {
    grossRwf,
    feeRwf,
    netRwf,
    feePercent: MOCK_RATE.feePercent,
    rate: MOCK_RATE.usdtToRwf,
  };
}

export function formatRwf(amount: number) {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUsdt(amount: number) {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDT`;
}
