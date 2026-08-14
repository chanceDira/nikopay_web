"use client";

import { useState } from "react";

const faqs = [
  {
    question: "What stablecoins do you support?",
    answer:
      "At launch, NikoPay supports USDT on the TRON network (TRC20). We plan to add USDC, Polygon-based stablecoins, and Bitcoin Lightning in future releases.",
  },
  {
    question: "Is NikoPay a wallet or exchange?",
    answer:
      "No. NikoPay is a payment bridge, not a custodial wallet, exchange, or trading platform. You retain custody of your assets until you initiate a transaction.",
  },
  {
    question: "Which mobile money networks are supported?",
    answer:
      "We launch with MTN Mobile Money in Rwanda. Airtel Money and additional networks across East Africa are on our roadmap.",
  },
  {
    question: "How fast are payouts?",
    answer:
      "Once your USDT transfer is confirmed on-chain, payouts to MTN Mobile Money are processed in near real-time. You can track status at every step.",
  },
  {
    question: "What are the fees?",
    answer:
      "NikoPay charges a transparent service fee on each transaction. The exact rate and net payout are displayed before you confirm. No hidden spreads.",
  },
  {
    question: "Is my crypto safe?",
    answer:
      "Yes. NikoPay does not hold your assets. You connect your own wallet and only send USDT when you choose to. Our treasury handles settlement separately.",
  },
  {
    question: "When are you launching?",
    answer:
      "We're launching first in Rwanda. Join the waitlist to be notified when NikoPay goes live and get early access.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
          {/* Left Column - Section Info */}
          <div className="lg:col-span-5 text-left lg:sticky lg:top-24">
            <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
              Common questions
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl text-foreground">
              Everything You Need to know, All in One Place
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-niko-muted">
              Discover quick and comprehensive answers to common questions about
              our platform, services, and features.
            </p>
          </div>

          {/* Right Column - Accordions */}
          <div className="lg:col-span-7 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.question}
                  className="rounded-md border border-niko-border bg-niko-surface overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    className="flex w-full min-h-12 items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-foreground transition-colors hover:bg-niko-navy/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-niko-teal"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <span className="text-sm sm:text-base">{faq.question}</span>
                    {/* Plus icon that rotates to become an x icon */}
                    <svg
                      className={`h-5 w-5 shrink-0 text-niko-teal transition-transform duration-300 ${
                        isOpen ? "rotate-45" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m-8-8h16"
                      />
                    </svg>
                  </button>
                  {/* Smooth height expansion placeholder (native transition helper) */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen
                        ? "grid-rows-[1fr] border-t border-niko-border"
                        : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 py-4">
                        <p className="text-sm leading-relaxed text-niko-muted">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
