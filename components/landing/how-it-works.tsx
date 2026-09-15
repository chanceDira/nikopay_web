const steps = [
  {
    number: "1",
    label: "First",
    title: "Connect your wallet",
    description:
      "Use WalletConnect, MetaMask, Trust Wallet, or Coinbase Wallet. You send from that wallet. We never ask for a seed phrase.",
  },
  {
    number: "2",
    label: "Next",
    title: "Send the quoted USDT",
    description:
      "Enter the recipient's mobile money number and country. Check the rate and fee, then send the exact USDT amount shown.",
  },
  {
    number: "3",
    label: "Finally",
    title: "Recipient gets local currency",
    description:
      "We pay out to their mobile money wallet. Watch the payment until it completes or fails.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-niko-band px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-left">
          <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps
          </h2>
          <p className="mt-4 max-w-2xl text-niko-muted leading-relaxed">
            Wallet send, then mobile money payout in the recipient&apos;s
            country. No exchange account required.
          </p>
        </div>

        <div className="relative mt-16 hidden md:block">
          <div
            className="absolute top-4 right-[16.666%] left-[16.666%] h-0.5 bg-niko-teal"
            aria-hidden
          />
          <ol className="grid grid-cols-3 gap-8">
            {steps.map((step) => (
              <li key={step.number} className="relative pt-12">
                <div className="absolute left-1/2 top-0 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-niko-teal text-niko-on-accent">
                  <span className="text-xs font-bold">{step.number}</span>
                </div>
                <article className="niko-panel p-6">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-niko-teal">
                    {step.label}
                  </p>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-niko-muted">
                    {step.description}
                  </p>
                </article>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative mt-12 md:hidden">
          <div
            className="absolute top-6 bottom-6 left-[15px] w-0.5 bg-niko-teal"
            aria-hidden
          />
          <ol className="space-y-6">
            {steps.map((step) => (
              <li key={step.number} className="relative pl-12">
                <div className="absolute top-6 left-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-niko-teal text-niko-on-accent">
                  <span className="text-xs font-bold">{step.number}</span>
                </div>
                <article className="niko-panel p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-niko-teal">
                    {step.label}
                  </p>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-niko-muted">
                    {step.description}
                  </p>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
