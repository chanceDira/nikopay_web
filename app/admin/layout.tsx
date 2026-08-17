"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { AdminNav } from "@/components/shared/admin-nav";

function subscribeAdminSession(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getAdminSession() {
  return localStorage.getItem("nikopay_admin_session") === "true";
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const hasSession = useSyncExternalStore(
    subscribeAdminSession,
    getAdminSession,
    () => false,
  );

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoginPage && !hasSession) {
      router.push("/admin/login");
    }
  }, [hasSession, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!hasSession) {
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
