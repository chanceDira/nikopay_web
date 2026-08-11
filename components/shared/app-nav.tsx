import Link from "next/link";

const links = [
  { href: "/app/pay", label: "New payment" },
  { href: "/app/payments", label: "History" },
  { href: "/app/profile", label: "Profile" },
] as const;

export function AppNav() {
  return (
    <header className="border-b border-niko-border bg-niko-surface/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight text-foreground">
          NikoPay
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
            href="/auth/sign-in"
            className="text-niko-muted transition-colors hover:text-niko-teal"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
