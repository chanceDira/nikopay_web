import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";

function AppleBadge() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
      <path
        fill="currentColor"
        d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.2 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2.1-1.1 2.8-2.2c.9-1.2 1.2-2.4 1.2-2.5-.1 0-2.3-.9-2.4-3.6zM14.8 5.9c.6-.8 1.1-1.8.9-2.9-1 .1-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.8 1.1.1 2.2-.5 2.9-1.4z"
      />
    </svg>
  );
}

function PhonePreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-[17.5rem] lg:ml-auto lg:mr-2"
      aria-hidden
    >
      <div
        className="pointer-events-none absolute -inset-6 rounded-full bg-niko-teal/15 blur-2xl"
        aria-hidden
      />
      <div className="relative aspect-[9/18.5] w-full rounded-[2rem] border border-neutral-700/80 bg-neutral-800 p-2 shadow-xl">
        <div className="flex h-full flex-col overflow-hidden rounded-[1.65rem] border border-neutral-900 bg-background">
          <div className="flex items-center justify-between px-4 pt-2.5 text-[9px] text-niko-muted">
            <span>9:41</span>
            <span className="mx-auto h-4 w-20 rounded-full bg-niko-surface" />
            <span>5G</span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-3.5 pb-2.5 pt-3">
            <div className="flex items-center justify-between gap-2">
              <BrandLogo className="h-6" width={96} height={24} />
              <span className="rounded-full border border-niko-teal/25 bg-niko-teal/10 px-2 py-0.5 text-[9px] font-medium text-niko-teal">
                Live
              </span>
            </div>

            <h3 className="mt-3 text-base font-bold tracking-tight">
              New payment
            </h3>
            <p className="mt-0.5 text-[10px] text-niko-muted">
              USDT in · local currency out
            </p>

            <div className="mt-3 flex items-center gap-2 rounded-lg border border-niko-border/80 bg-niko-well/70 px-2.5 py-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-niko-teal/15 text-[9px] font-bold text-niko-teal">
                W
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-niko-muted">Wallet connected</p>
                <p className="truncate font-mono text-[10px] text-foreground">
                  0x7a…9c2e · Base
                </p>
              </div>
              <Image
                src="/logos/walletconnect-logo.png"
                alt=""
                width={14}
                height={14}
                className="object-contain opacity-80"
              />
            </div>

            <div className="mt-2.5 space-y-2">
              <div className="rounded-lg border border-niko-border bg-niko-surface px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-wider text-niko-muted">
                  You send
                </p>
                <div className="mt-0.5 flex items-baseline justify-between gap-2">
                  <p className="font-mono text-xl font-bold tracking-tight">
                    100
                  </p>
                  <span className="text-[11px] font-semibold text-niko-teal">
                    USDT
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-niko-border bg-niko-well text-niko-teal">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </span>
              </div>

              <div className="rounded-lg border border-niko-teal/25 bg-niko-teal/5 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-wider text-niko-muted">
                    Recipient receives
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-niko-teal">
                    RWF
                    <svg
                      className="h-2.5 w-2.5 opacity-70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-xl font-bold text-niko-teal-bright">
                  142,825
                </p>
                <p className="mt-0.5 text-[9px] text-niko-muted">
                  via mobile money
                </p>
              </div>

              <div className="rounded-lg border border-niko-border/70 bg-niko-surface/70 px-2.5 py-2 text-[10px]">
                <div className="flex justify-between gap-2 text-niko-muted">
                  <span>Rate</span>
                  <span className="font-mono text-foreground">
                    1 = 1,450 RWF
                  </span>
                </div>
                <div className="mt-1 flex justify-between gap-2 text-niko-muted">
                  <span>Fee</span>
                  <span className="font-mono text-foreground">RWF 2,175</span>
                </div>
                <div className="mt-1 flex justify-between gap-2 text-niko-muted">
                  <span>To</span>
                  <span className="font-mono text-foreground">
                    078 725 9588
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-niko-teal py-2.5 text-center text-xs font-bold text-niko-on-accent">
                Confirm and send
              </div>
            </div>

            <div className="mt-auto border-t border-niko-border/40 pt-2.5">
              <div className="flex justify-between px-2 text-[9px] text-niko-muted">
                <span className="font-medium text-niko-teal">Send</span>
                <span>Activity</span>
                <span>Account</span>
              </div>
              <div className="mx-auto mt-2.5 h-1 w-24 rounded-full bg-niko-muted/35" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DownloadApp() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
      >
        <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-niko-blue/30 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-niko-teal/25 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div className="animate-fade-up">
          <BrandLogo className="h-10" priority />
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Get NikoPay on{" "}
            <span className="niko-gradient-text">your phone</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-niko-muted">
            Get the iOS and Android app as it rolls out, or pay in the browser
            now. Same flow: USDT from your wallet, local currency on mobile
            money in a supported African country.
          </p>

          <div id="stores" className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#ios"
              id="ios"
              className="inline-flex min-w-[200px] items-center gap-3 rounded-md bg-foreground px-5 py-3 text-background transition-opacity hover:opacity-90"
            >
              <AppleBadge />
              <span className="text-left">
                <span className="block text-[10px] uppercase tracking-wider opacity-70">
                  Download on the
                </span>
                <span className="block text-base font-semibold leading-tight">
                  App Store
                </span>
              </span>
            </a>
            <a
              href="#android"
              id="android"
              className="inline-flex min-w-[200px] items-center gap-3 rounded-md border border-niko-border bg-niko-surface px-5 py-3 text-foreground transition-colors hover:border-niko-teal/50"
            >
              <Image
                src="/logos/playstore-logo.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
              <span className="text-left">
                <span className="block text-[10px] uppercase tracking-wider text-niko-muted">
                  Get it on
                </span>
                <span className="block text-base font-semibold leading-tight">
                  Google Play
                </span>
              </span>
            </a>
          </div>

          <p className="mt-6 text-sm text-niko-muted">
            Store listings are rolling out. You can also{" "}
            <Link
              href="/auth/sign-in"
              className="text-niko-teal underline underline-offset-4 hover:text-niko-teal-bright"
            >
              pay now in the browser
            </Link>
            .
          </p>
        </div>

        <PhonePreview />
      </div>
    </section>
  );
}
