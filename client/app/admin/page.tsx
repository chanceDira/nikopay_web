import { AdminOverviewCards } from "@/components/admin/overview-cards";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminOverviewPage() {
  return (
    <PageHeader
      title="Overview"
      description="Payment volume and operational status"
    >
      <AdminOverviewCards />
    </PageHeader>
  );
}
