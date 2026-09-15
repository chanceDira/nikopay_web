"use client";

import { AdminNav } from "@/components/admin/admin-nav";
import { useAdminWalletGuard } from "@/components/admin/use-admin-wallet-guard";
import { usePathname } from "next/navigation";

export function AdminShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const { ready, authed } = useAdminWalletGuard(!isLoginPage);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!ready || !authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-niko-teal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-full bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
      >
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-niko-teal/10 blur-3xl" />
        <div className="absolute right-0 top-32 h-64 w-64 rounded-full bg-niko-blue/15 blur-3xl" />
      </div>
      <AdminNav />
      <main className="relative w-full px-4 pb-16 pt-8 sm:px-6 lg:pl-64 lg:pr-6 xl:pr-8">
        {children}
      </main>
    </div>
  );
}
