"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    label: "First",
    title: "Connect your wallet",
    description:
      "Link your WalletConnect-compatible wallet (Trust Wallet, MetaMask, or Coinbase Wallet). You keep custody until you send.",
  },
  {
    number: "02",
    label: "Next",
    title: "Send USDT",
    description:
      "Enter the recipient's Mobile Money number, review the transparent exchange rate and fees, then confirm your USDT transfer.",
  },
  {
    number: "03",
    label: "Finally",
    title: "Recipient gets RWF",
    description:
      "RWF lands on the recipient's mobile money account. Track status in real time and download your receipt.",
  },
];

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
        <div className="text-left">
          <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
            How it Works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps to spendable money
          </h2>
          <p className="mt-4 max-w-2xl text-niko-muted leading-relaxed">
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
                <div className="rounded-md border border-niko-border bg-niko-surface p-6">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wider text-niko-teal">
                    {step.label}
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-niko-muted">
                    {step.description}
                  </p>
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
              className="rounded-md border border-niko-border bg-niko-surface p-6"
            >
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-niko-teal">
                  {step.label}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-niko-muted">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
