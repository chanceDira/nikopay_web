const securityItems = [
  {
    title: "Encrypted data storage",
    description: "All sensitive data encrypted at rest and in transit.",
  },
  {
    title: "Role-based access control",
    description: "Granular permissions for admin and operational teams.",
  },
  {
    title: "Full audit logging",
    description: "Every action recorded for compliance and reconciliation.",
  },
  {
    title: "Fraud monitoring",
    description: "Automated risk detection and manual review workflows.",
  },
];

export function Security() {
  return (
    <section className="border-y border-niko-border bg-niko-navy/20 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
              Trust &amp; Security
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Enterprise-grade protection
            </h2>
            <p className="mt-4 text-niko-muted">
              NikoPay is built with security at its core. From wallet
              connectivity to Mobile Money settlement, every layer is designed
              for compliance, transparency, and reliability.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {securityItems.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-niko-border bg-niko-surface p-5"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-niko-teal/10">
                  <svg
                    className="h-4 w-4 text-niko-teal"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-niko-muted">
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
