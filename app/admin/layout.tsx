import { AdminNav } from "@/components/shared/admin-nav";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col">
      <AdminNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
