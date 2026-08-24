import type { Metadata } from "next";
import { AppNav } from "@/components/shared/app-nav";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col">
      <AppNav />
      <main className="flex-1 pt-36 pb-12 px-4 sm:px-6">{children}</main>
    </div>
  );
}
