import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";

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
              <span className="rounded-full border border-niko-border/40 bg-niko-surface px-2 py-0.5 text-[9px] font-medium text-niko-muted">
                Preview
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
                <p className="text-[9px] text-niko-muted">Your wallet</p>
                <p className="truncate font-mono text-[10px] text-foreground">
                  Connect to pay · Base
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
                  <span className="font-mono text-foreground">MTN · Rwanda</span>
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
            <Link
              href="/auth/sign-in"
              className="inline-flex min-w-[200px] items-center justify-center rounded-md bg-niko-teal px-5 py-3 text-sm font-semibold text-niko-on-accent transition-colors hover:bg-niko-teal-bright"
            >
              Pay in the browser
            </Link>
            <Link
              href="/#waitlist"
              className="inline-flex min-w-[200px] items-center justify-center rounded-md border border-niko-border bg-niko-surface px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-niko-teal/50"
            >
              Get app launch notes
            </Link>
          </div>

          <p className="mt-6 text-sm text-niko-muted">
            iOS and Android store listings are not open yet. Browser pay works
            now on supported corridors.
          </p>
        </div>

        <PhonePreview />
      </div>
    </section>
  );
}
