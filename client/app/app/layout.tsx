import { AppNav } from "@/components/shared/app-nav";

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
