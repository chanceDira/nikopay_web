"use client";

const features = [
  {
    id: "non-custodial",
    title: "Non-custodial",
    description:
      "You retain custody of your assets until the moment you initiate a transaction. NikoPay is a bridge, not a wallet.",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
  },
  {
    id: "fees",
    title: "Transparent fees",
    description:
      "See the exchange rate, service fee, and net payout before you confirm. No hidden spreads.",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: "tracking",
    title: "Real-time tracking",
    description:
      "Monitor every transaction from USDT sent to RWF delivered. Status updates at each stage.",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  {
    id: "receipts",
    title: "Downloadable receipts",
    description:
      "Access your full transaction history and download receipts for accounting or records.",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    id: "security",
    title: "Secure treasury",
    description:
      "Enterprise-grade encryption, role-based access, and full audit trails protect every settlement.",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    id: "rwanda",
    title: "Rwanda-first",
    description:
      "Built for Rwanda's mobile money ecosystem. Expanding across East Africa next.",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="bg-niko-surface/30 px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-left">
          <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Built for trust and speed
          </h2>
          <p className="mt-4 max-w-2xl text-niko-muted leading-relaxed">
            Everything you need to move value from blockchain to everyday
            spending, without the complexity.
          </p>
        </div>

        {/* Dynamic Card Grid (3 columns on desktop, 2 on tablet, 1 on mobile) */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="flex flex-col rounded-md border border-niko-border/40 bg-niko-surface p-6 hover:border-niko-teal/30 hover:shadow-[0_0_15px_rgba(0,212,200,0.04)] transition-all group"
            >
              {/* Icon container */}
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-niko-teal/10 text-niko-teal group-hover:bg-niko-teal group-hover:text-niko-navy transition-all duration-300">
                {feature.icon}
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-foreground group-hover:text-niko-teal transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs leading-relaxed text-niko-muted">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
