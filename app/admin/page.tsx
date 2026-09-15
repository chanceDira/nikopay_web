import { AdminOverviewCards } from "@/components/admin/overview-cards";
import { AdminOpsPanel } from "@/components/admin/ops-panel";
import { AdminPage } from "@/components/admin/admin-page";

export default function AdminOverviewPage() {
  return (
    <AdminPage title="Overview" description="Volume and ops">
      <div className="space-y-8">
        <AdminOpsPanel />
        <AdminOverviewCards />
      </div>
    </AdminPage>
  );
}
