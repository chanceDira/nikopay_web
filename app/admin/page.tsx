import { AdminOverviewCards } from "@/components/admin/overview-cards";
import { AdminOpsPanel } from "@/components/admin/ops-panel";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminOverviewPage() {
  return (
    <PageHeader title="Overview" description="Volume and ops">
      <div className="space-y-8">
        <AdminOpsPanel />
        <AdminOverviewCards />
      </div>
    </PageHeader>
  );
}
