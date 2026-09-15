import Image from "next/image";

const items = [
  { name: "Trust Wallet", src: "/logos/trustwallet-logo.webp" },
  { name: "MetaMask", src: "/logos/metamask-logo.png" },
  { name: "Coinbase Wallet", src: "/logos/coinbase-logo.webp" },
  { name: "WalletConnect", src: "/logos/walletconnect-logo.png" },
  { name: "Mobile money", src: "/logos/mtn-logo.jpg", rounded: true },
  { name: "USDT", src: "/logos/usdt-logo.png" },
  { name: "USDC", src: "/logos/usdc-logo.webp" },
] as const;

type TrustItem = {
  name: string;
  src: string;
  rounded?: boolean;
};

function TrustChip({ name, src, rounded }: TrustItem) {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-md border border-niko-border/25 bg-niko-surface px-4 py-2.5 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-niko-well/80 p-1.5">
        <Image
          src={src}
          alt=""
          width={24}
          height={24}
          className={`object-contain ${rounded ? "rounded-sm" : ""}`}
        />
      </div>
      <span className="text-sm font-medium text-foreground">{name}</span>
    </div>
  );
}

export function TrustBar() {
  const sequence = [...items, ...items];
  const track = [...sequence, ...sequence];

  return (
    <section
      className="border-y border-niko-border/40 py-4 sm:py-5"
      aria-label="Supported wallets and rails"
    >
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent sm:w-20"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent sm:w-20"
          aria-hidden
        />
        <div className="niko-marquee flex w-max gap-4 py-1 sm:gap-5">
          {track.map((item, index) => (
            <TrustChip key={`${item.name}-${index}`} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
