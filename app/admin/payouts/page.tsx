import { Suspense } from "react";
import { AdminPayoutsTable } from "@/components/admin/payouts-table";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminPayoutsPage() {
  return (
    <PageHeader
      title="Payouts"
      description="Payout amounts debited from the PawaPay wallet"
    >
      <Suspense
        fallback={
          <p className="text-sm font-mono text-niko-muted">Loading...</p>
        }
      >
        <AdminPayoutsTable />
      </Suspense>
    </PageHeader>
  );
}
