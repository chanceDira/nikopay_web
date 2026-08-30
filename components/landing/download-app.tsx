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
    <div className="relative mx-auto h-[min(34rem,70vh)] aspect-[9/19.5]">
      <div
        className="pointer-events-none absolute -inset-8 rounded-full bg-niko-teal/20 blur-3xl"
        aria-hidden
      />
      <div className="relative h-full w-full rounded-[2.2rem] border border-neutral-700 bg-neutral-800 p-2 shadow-2xl niko-glow">
        <div className="flex h-full flex-col overflow-hidden rounded-[2.05rem] border border-neutral-900 bg-background">
          <div className="flex items-center justify-between px-5 pt-3 text-[10px] text-niko-muted">
            <span>9:41</span>
            <span className="mx-auto h-5 w-24 rounded-full bg-niko-surface" />
            <span>5G</span>
          </div>
          <div className="flex flex-1 flex-col px-5 pb-3 pt-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-niko-teal">
              NikoPay
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight">
              New payment
            </h3>
            <p className="mt-1 text-xs text-niko-muted">USDT in. RWF out.</p>

            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-niko-border bg-niko-surface/70 p-4">
                <p className="text-[10px] uppercase tracking-wider text-niko-muted">
                  Recipient receives
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-niko-teal-bright">
                  50,000 RWF
                </p>
              </div>
              <div className="rounded-xl border border-niko-border bg-niko-surface/50 p-4 text-xs">
                <div className="flex justify-between text-niko-muted">
                  <span>You send</span>
                  <span className="font-mono text-foreground">37.12 USDT</span>
                </div>
                <div className="mt-3 flex justify-between text-niko-muted">
                  <span>To</span>
                  <span className="font-mono text-foreground">078 725 9588</span>
                </div>
              </div>
              <div className="rounded-xl bg-niko-teal py-3.5 text-center text-sm font-bold text-niko-navy">
                Confirm and send
              </div>
            </div>

            <div className="mt-auto border-t border-niko-border/50 pt-4">
              <div className="flex justify-between px-2 text-[10px] text-niko-muted">
                <span className="text-niko-teal">Send</span>
                <span>Activity</span>
                <span>Account</span>
              </div>
              <div className="mx-auto mt-4 h-1 w-28 rounded-full bg-niko-muted/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DownloadApp() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
      >
        <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-niko-blue/30 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-niko-teal/25 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-start gap-16 lg:grid-cols-2">
        <div className="animate-fade-up">
          <BrandLogo className="h-10" priority />
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Get NikoPay on{" "}
            <span className="niko-gradient-text">your phone</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-niko-muted">
            Download the NikoPay app to send USDT from your wallet and pay a
            Mobile Money recipient in RWF. Same flow as the web, made for
            mobile.
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
            Prefer the browser?{" "}
            <Link
              href="/auth/sign-in"
              className="text-niko-teal underline underline-offset-4 hover:text-niko-teal-bright"
            >
              Pay Now on the web
            </Link>
          </p>
        </div>

        <PhonePreview />
      </div>
    </section>
  );
}
