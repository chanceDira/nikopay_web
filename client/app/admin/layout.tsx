"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminNav } from "@/components/shared/admin-nav";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isLoginPage) {
        setAuthorized(true);
        return;
      }

      const hasSession =
        localStorage.getItem("nikopay_admin_session") === "true";
      if (!hasSession) {
        setAuthorized(false);
        router.push("/admin/login");
      } else {
        setAuthorized(true);
      }
    }
  }, [pathname, isLoginPage, router]);

  // Prevent layout flashes during routing auth check
  if (authorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-niko-teal border-t-transparent" />
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full flex-col">
      <AdminNav />
      <main className="flex-1 pt-36 pb-12 px-4 sm:px-6">{children}</main>
    </div>
  );
}
