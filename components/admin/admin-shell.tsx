"use client";

import { AdminNav } from "@/components/shared/admin-nav";
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
    <div className="flex min-h-full flex-col">
      <AdminNav />
      <main className="flex-1 pt-36 pb-12 px-4 sm:px-6">{children}</main>
    </div>
  );
}
