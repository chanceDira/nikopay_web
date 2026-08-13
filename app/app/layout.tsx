import { AppNav } from "@/components/shared/app-nav";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col">
      <AppNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
