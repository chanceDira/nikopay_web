import { AdminFxForm } from "@/components/admin/fx-form";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminFxPage() {
  return (
    <PageHeader
      title="Exchange rates"
      description="USDT to local rates and fees"
    >
      <AdminFxForm />
    </PageHeader>
  );
}
