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
  const isLoginPage = pathname === "/admin/login";
  const [ready, setReady] = useState(isLoginPage);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    let cancelled = false;
    void fetch("/api/admin/session").then(async (res) => {
      if (cancelled) {
        return;
      }
      if (res.ok) {
        setAuthed(true);
        setReady(true);
        return;
      }
      setAuthed(false);
      setReady(true);
      router.push("/admin/login");
    });

    return () => {
      cancelled = true;
    };
  }, [isLoginPage, router]);

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
