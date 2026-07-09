const wallets = [
  { name: "Trust Wallet", abbr: "TW" },
  { name: "MetaMask", abbr: "MM" },
  { name: "Coinbase Wallet", abbr: "CB" },
  { name: "WalletConnect", abbr: "WC" },
];

export function TrustBar() {
  return (
    <section className="border-y border-niko-border bg-niko-surface/50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-niko-muted">
          Compatible with leading wallets &amp; networks
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {wallets.map((wallet) => (
            <div
              key={wallet.name}
              className="flex items-center gap-2 text-niko-muted"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-niko-border bg-niko-navy text-xs font-bold text-niko-teal">
                {wallet.abbr}
              </span>
              <span className="hidden text-sm sm:inline">{wallet.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-niko-border bg-[#FFCC00]/10 text-xs font-bold text-[#FFCC00]">
              MTN
            </span>
            <span className="hidden text-sm text-niko-muted sm:inline">
              MTN Mobile Money
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-niko-border bg-niko-navy text-xs font-bold text-niko-teal">
              TRC
            </span>
            <span className="hidden text-sm text-niko-muted sm:inline">
              USDT (TRC20)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
