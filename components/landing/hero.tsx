import Link from "next/link";
import { RateCalculator } from "./rate-calculator";

export function Hero() {
  return (
    <section className="relative flex flex-1 flex-col justify-center overflow-hidden px-4 pb-6 pt-28 sm:px-6 sm:pb-8 sm:pt-32">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
      >
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-niko-blue/30 blur-3xl" />
        <div className="absolute -right-32 top-32 h-80 w-80 rounded-full bg-niko-teal/20 blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="animate-fade-up">
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Making <span className="niko-gradient-text">stablecoins</span>{" "}
            spendable
          </h1>

          <p className="mt-4 max-w-lg text-base leading-relaxed text-niko-muted sm:text-lg">
            Send stablecoins from your wallet. We pay the recipient in local
            currency on mobile money. Rate and fee are shown before you confirm.
          </p>
          <p className="mt-2 text-sm text-niko-muted">
            USDT on Base Sepolia (testnet). Mainnet and USDC are next.
          </p>

          <div className="mt-6 flex flex-col gap-4 sm:items-start">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/auth/sign-in"
                className="inline-flex h-11 items-center justify-center rounded-md bg-niko-teal px-7 text-sm font-semibold text-niko-on-accent transition-colors hover:bg-niko-teal-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-niko-teal"
              >
                Pay now
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-11 items-center justify-center rounded-md border border-niko-border px-7 text-sm font-medium text-foreground transition-colors hover:border-niko-teal/50 hover:bg-niko-surface"
              >
                How it works
              </a>
            </div>

            <p className="text-sm text-niko-muted">
              Get the{" "}
              <Link
                href="/download"
                className="text-niko-teal underline underline-offset-4 transition-colors hover:text-niko-teal-bright"
              >
                iOS and Android app
              </Link>
              {" as it rolls out, or "}
              <a
                href="#waitlist"
                className="text-niko-teal underline underline-offset-4 transition-colors hover:text-niko-teal-bright"
              >
                get notes by email
              </a>
              .
            </p>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <RateCalculator />
        </div>
      </div>
    </section>
  );
}
