export function formatRwf(amount: number) {
  return formatLocalAmount(amount, "RWF");
}

export function formatLocalAmount(amount: number, currency: string) {
  const code = currency.trim().toUpperCase() || "RWF";
  const fractionDigits = code === "RWF" || code === "UGX" ? 0 : 2;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("en-US", {
      maximumFractionDigits: fractionDigits,
    })} ${code}`;
  }
}

export function formatUsdt(amount: number) {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDT`;
}
