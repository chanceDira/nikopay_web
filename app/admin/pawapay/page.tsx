import { AdminPawapayDashboard } from "@/components/admin/pawapay-dashboard";
import { AdminPage } from "@/components/admin/admin-page";

export default function AdminPawapayPage() {
  return (
    <AdminPage title="PawaPay" description="Balances, corridors, payouts">
      <AdminPawapayDashboard />
    </AdminPage>
  );
}
