const personas = [
  {
    title: "Freelancers",
    description:
      "Get paid in USDT from global clients and spend locally on rent, food, and daily needs.",
    emoji: "💼",
  },
  {
    title: "Remote Workers",
    description:
      "Convert your stablecoin salary into RWF for bills, transport, and family support.",
    emoji: "🌍",
  },
  {
    title: "Diaspora",
    description:
      "Send value home instantly. Recipients receive RWF directly on their Mobile Money.",
    emoji: "✈️",
  },
  {
    title: "Tourists & Visitors",
    description:
      "Hold USDT for travel and pay local merchants or peers through Mobile Money.",
    emoji: "🧳",
  },
];

export function Personas() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
            Who It&apos;s For
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            For anyone earning in digital assets
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-niko-muted">
            Whether you work remotely, freelance globally, or support family
            abroad, NikoPay turns stablecoins into real purchasing power.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((persona) => (
            <article
              key={persona.title}
              className="group rounded-2xl border border-niko-border bg-niko-surface p-6 transition-all hover:border-niko-teal/30 hover:bg-niko-teal/5"
            >
              <span className="text-3xl" aria-hidden>
                {persona.emoji}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{persona.title}</h3>
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
