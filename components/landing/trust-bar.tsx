import Image from "next/image";

const wallets = [
  { name: "Trust Wallet", src: "/logos/trustwallet-logo.webp" },
  { name: "MetaMask", src: "/logos/metamask-logo.png" },
  { name: "Coinbase Wallet", src: "/logos/coinbase-logo.webp" },
  { name: "WalletConnect", src: "/logos/walletconnect-logo.png" },
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
              className="flex items-center gap-2.5 text-niko-muted hover:text-foreground transition-colors group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-niko-border bg-niko-navy/60 overflow-hidden p-1.5 transition-all group-hover:border-niko-teal/30 group-hover:shadow-[0_0_8px_rgba(0,212,200,0.15)]">
                <Image
                  src={wallet.src}
                  alt={wallet.name}
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span className="hidden text-sm sm:inline font-medium">
                {wallet.name}
              </span>
            </div>
          ))}

          {/* MTN Mobile Money */}
          <div className="flex items-center gap-2.5 text-niko-muted hover:text-foreground transition-colors group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-niko-border bg-niko-navy/60 overflow-hidden p-1.5 transition-all group-hover:border-niko-teal/30 group-hover:shadow-[0_0_8px_rgba(0,212,200,0.15)]">
              <Image
                src="/logos/mtn-logo.jpg"
                alt="MTN Mobile Money"
                width={24}
                height={24}
                className="object-contain rounded-sm"
              />
            </div>
            <span className="hidden text-sm sm:inline font-medium">
              MTN Mobile Money
            </span>
          </div>

          {/* USDT Stablecoin */}
          <div className="flex items-center gap-2.5 text-niko-muted hover:text-foreground transition-colors group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-niko-border bg-niko-navy/60 overflow-hidden p-1.5 transition-all group-hover:border-niko-teal/30 group-hover:shadow-[0_0_8px_rgba(0,212,200,0.15)]">
              <Image
                src="/logos/usdt-logo.png"
                alt="USDT"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
            <span className="hidden text-sm sm:inline font-medium">USDT</span>
          </div>
        </div>
      </div>
    </section>
  );
}
