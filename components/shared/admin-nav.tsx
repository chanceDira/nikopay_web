import Link from "next/link";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/review", label: "Review" },
  { href: "/admin/fx", label: "FX" },
  { href: "/admin/treasury", label: "Treasury" },
  { href: "/admin/users", label: "Users" },
] as const;

export function AdminNav() {
  return (
    <header className="border-b border-niko-border bg-niko-surface/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/admin"
          className="font-semibold tracking-tight text-foreground"
        >
          NikoPay admin
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-niko-muted transition-colors hover:text-niko-teal"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/app"
            className="text-niko-muted transition-colors hover:text-niko-teal"
          >
            App
          </Link>
        </nav>
      </div>
    </header>
  );
}
