import { AdminPawapayDashboard } from "@/components/admin/pawapay-dashboard";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminPawapayPage() {
  return (
    <PageHeader title="PawaPay" description="Balances, corridors, payouts">
      <AdminPawapayDashboard />
    </PageHeader>
  );
}
