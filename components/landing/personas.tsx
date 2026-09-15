const personas = [
  {
    title: "Freelancers",
    description:
      "Get paid in USDT and spend locally on rent, data, and daily costs.",
  },
  {
    title: "Remote workers",
    description:
      "Turn a stablecoin salary into the currency you actually use for bills and family.",
  },
  {
    title: "Family support",
    description:
      "Send to a relative's mobile money number. They receive local currency, not a crypto app.",
  },
  {
    title: "Visitors",
    description:
      "Keep USDT for the trip and pay people on the networks they already use.",
  },
  {
    title: "Traders",
    description:
      "Move USDT off an exchange into spendable mobile money without a local bank account.",
  },
  {
    title: "No local bank",
    description:
      "If the recipient has a mobile money wallet, you can pay them in their country when that corridor is open.",
  },
];

export function Personas() {
  return (
    <section className="bg-niko-band px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="text-left">
          <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
            Who it&apos;s for
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            For people who earn in USDT
          </h2>
          <p className="mt-4 max-w-2xl text-niko-muted leading-relaxed">
            Pay someone on mobile money in a supported African country. They do
            not need a crypto wallet.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => (
            <article key={persona.title} className="niko-panel p-6">
              <h3 className="text-base font-semibold text-foreground">
                {persona.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-niko-muted">
                {persona.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
