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
