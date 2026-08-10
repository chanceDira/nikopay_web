"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Connect your wallet",
    description:
      "Link your WalletConnect-compatible wallet (Trust Wallet, MetaMask, or Coinbase Wallet). You keep custody until you send.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    visual: "wallet",
  },
  {
    number: "02",
    title: "Send USDT",
    description:
      "Enter the recipient's Mobile Money number, review the transparent exchange rate and fees, then confirm your USDT transfer.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    visual: "send",
  },
  {
    number: "03",
    title: "Recipient gets RWF",
    description:
      "RWF lands on the recipient's MTN Mobile Money account. Track status in real time and download your receipt.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    visual: "phone",
  },
];

function StepVisual({ type }: { type: string }) {
  if (type === "wallet") {
    return (
      <div className="mx-auto flex h-32 w-40 items-center justify-center rounded-xl border border-niko-border bg-niko-navy">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-8 w-12 rounded border border-niko-teal/40 bg-niko-teal/10" />
          <div className="mx-auto h-1 w-16 rounded bg-niko-border" />
          <div className="mx-auto h-1 w-10 rounded bg-niko-border" />
        </div>
      </div>
    );
  }
  if (type === "send") {
    return (
      <div className="mx-auto flex h-32 w-40 flex-col items-center justify-center rounded-xl border border-niko-border bg-niko-navy">
        <span className="font-mono text-lg font-bold text-niko-teal">100 USDT</span>
        <svg className="my-2 h-4 w-4 text-niko-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        <span className="font-mono text-sm text-niko-teal-bright">133,000 RWF</span>
      </div>
    );
  }
  return (
    <div className="mx-auto flex h-32 w-24 items-center justify-center rounded-2xl border-2 border-niko-teal/30 bg-niko-surface">
      <div className="text-center">
        <div className="mx-auto mb-2 h-2 w-8 rounded-full bg-niko-border" />
        <div className="rounded-lg bg-[#FFCC00]/20 px-3 py-2">
          <span className="text-xs font-bold text-[#FFCC00]">MTN</span>
          <p className="mt-1 font-mono text-xs text-niko-teal">+250 ***</p>
        </div>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-step"));
            if (!Number.isNaN(index)) setActiveStep(index);
          }
        });
      },
      { threshold: 0.6, rootMargin: "-20% 0px" },
    );

    const stepEls = section.querySelectorAll("[data-step]");
    stepEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const progress = ((activeStep + 1) / steps.length) * 100;

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
            How it Works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps to spendable money
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-niko-muted">
            From your crypto wallet to a Mobile Money account in Rwanda. No
            exchange accounts, no bank delays.
          </p>
        </div>

        <div className="relative mt-16 hidden md:block">
          <div className="absolute left-0 right-0 top-8 h-0.5 bg-niko-border" />
          <div
            className="bridge-progress absolute left-0 top-8 h-0.5 niko-bridge-line origin-left transition-transform duration-700 ease-out"
            style={{ width: `${progress}%`, transform: `scaleX(1)` }}
          />
          <div className="grid grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div
                key={step.number}
                data-step={i}
                className={`relative pt-16 transition-opacity duration-500 ${
                  i <= activeStep ? "opacity-100" : "opacity-40"
                }`}
              >
                <div
                  className={`absolute left-1/2 top-4 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 transition-colors ${
                    i <= activeStep
                      ? "border-niko-teal bg-niko-teal text-niko-navy"
                      : "border-niko-border bg-niko-surface text-niko-muted"
                  }`}
                >
                  <span className="text-xs font-bold">{i + 1}</span>
                </div>
                <div className="rounded-2xl border border-niko-border bg-niko-surface p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-niko-teal/10 text-niko-teal">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-niko-muted">
                    {step.description}
                  </p>
                  <div className="mt-6">
                    <StepVisual type={step.visual} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 space-y-6 md:hidden">
          {steps.map((step, i) => (
            <div
              key={step.number}
              data-step={i}
              className="rounded-2xl border border-niko-border bg-niko-surface p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-niko-teal text-sm font-bold text-niko-navy">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-niko-muted">
                    {step.description}
                  </p>
                  <div className="mt-4">
                    <StepVisual type={step.visual} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
