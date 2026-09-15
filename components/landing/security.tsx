const securityItems = [
  {
    title: "Encrypted storage",
    description: "Sensitive fields are encrypted in transit and at rest.",
  },
  {
    title: "Limited admin access",
    description: "Ops tools are behind a signed admin session, not public.",
  },
  {
    title: "Audit log",
    description: "Admin actions and payout state changes are recorded.",
  },
  {
    title: "Review queue",
    description:
      "Mismatched deposits go to manual review. They are not paid silently.",
  },
];

export function Security() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
              Trust and security
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              How we settle
            </h2>
            <p className="mt-4 text-niko-muted leading-relaxed">
              You send USDT from your wallet. We match it on treasury and pay
              out on mobile money. Access is limited. Payouts are logged.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {securityItems.map((item) => (
              <div key={item.title} className="niko-panel p-5">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-niko-muted">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
