"use client";

import { useState } from "react";

const faqs = [
  {
    question: "What can I send?",
    answer:
      "USDT on Polygon and Base today. USDC is planned. You send from your own wallet. Other coins and chains are not available yet.",
  },
  {
    question: "Is NikoPay a wallet or an exchange?",
    answer:
      "Neither. You keep your USDT in your wallet until you pay. When you confirm, that amount goes to the NikoPay treasury and we pay out local currency on mobile money. We do not hold a balance for you between payments.",
  },
  {
    question: "Which countries and networks?",
    answer:
      "Supported countries and mobile money providers are listed when you pay, on web and in the app. You pick the country, then the network (for example MTN or Airtel). Corridors follow what the rail has open.",
  },
  {
    question: "How fast is the payout?",
    answer:
      "After the USDT deposit confirms on-chain, most payouts complete in minutes. If a network is delayed, the transfer can sit in a queue. The payment page shows the current status.",
  },
  {
    question: "What are the fees?",
    answer:
      "A service fee is taken from the quoted amount. The rate, fee, and net payout are shown before you send. What you confirm is what we settle, not a client-supplied price.",
  },
  {
    question: "What happens to the USDT I send?",
    answer:
      "It is sent to the NikoPay treasury for that chain. We do not ask for your seed phrase. Only send the exact amount shown. Rounding can delay matching.",
  },
  {
    question: "Can I pay someone in another African country?",
    answer:
      "Yes, if that corridor is open. Choose the recipient's country and mobile money network, then send. New corridors appear when the rail enables them.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "Yes. The iOS and Android app is rolling out. You can pay in the browser today. Both use the same flow: send USDT, recipient gets local currency on mobile money.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
          <div className="lg:col-span-5 text-left lg:sticky lg:top-28">
            <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl text-foreground">
              Questions
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-niko-muted">
              Short answers about sending USDT and paying out on mobile money.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.question}
                  className="niko-panel overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    className="flex w-full min-h-12 items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-foreground transition-colors hover:bg-niko-teal/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-niko-teal"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <span className="text-sm sm:text-base">{faq.question}</span>
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
