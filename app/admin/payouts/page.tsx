import { Suspense } from "react";
import { AdminPayoutsTable } from "@/components/admin/payouts-table";
import { AdminPage } from "@/components/admin/admin-page";

export default function AdminPayoutsPage() {
  return (
    <AdminPage title="Payouts" description="PawaPay transfers">
      <Suspense
        fallback={
          <p className="text-sm font-mono text-niko-muted">Loading...</p>
        }
      >
        <AdminPayoutsTable />
      </Suspense>
    </AdminPage>
  );
}
