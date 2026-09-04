import Link from "next/link";
import { RateCalculator } from "./rate-calculator";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-40">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
      >
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-niko-blue/30 blur-3xl" />
        <div className="absolute -right-32 top-32 h-80 w-80 rounded-full bg-niko-teal/20 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-niko-border bg-niko-surface px-4 py-1.5 text-sm">
            <span className="text-lg" aria-hidden>
              🇷🇼
            </span>
            <span className="text-niko-muted">
              Launching in{" "}
              <span className="font-medium text-foreground">Rwanda</span>
            </span>
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Making <span className="niko-gradient-text">Stablecoins</span>{" "}
            Spendable
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-niko-muted">
            Bridge your USDT to Rwandan Francs through mobile money.
            Non-custodial, transparent rates, and instant local payouts.
          </p>

          <div className="mt-8 flex flex-col gap-6 sm:items-start">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/download"
                className="inline-flex h-12 items-center justify-center rounded-md bg-niko-teal px-8 text-sm font-semibold text-niko-navy transition-colors hover:bg-niko-teal-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-niko-teal"
              >
                Launch App
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-md border border-niko-border px-8 text-sm font-medium text-foreground transition-colors hover:border-niko-teal/50 hover:bg-niko-surface"
              >
                See How It Works
              </a>
            </div>

            <p className="text-sm text-niko-muted">
              Do not have a Web3 wallet yet?{" "}
              <a
                href="#waitlist"
                className="text-niko-teal underline underline-offset-4 hover:text-niko-teal-bright transition-colors"
              >
                Subscribe for email updates
              </a>
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
