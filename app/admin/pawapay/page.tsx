import { AdminPawapayDashboard } from "@/components/admin/pawapay-dashboard";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminPawapayPage() {
  return (
    <PageHeader
      title="PawaPay"
      description="Live wallets, provider status, corridors, and payout history"
    >
      <AdminPawapayDashboard />
    </PageHeader>
  );
}
