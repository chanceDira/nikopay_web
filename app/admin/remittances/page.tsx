import { AdminRemittances } from "@/components/admin/remittances";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminRemittancesPage() {
  return (
    <PageHeader
      title="Remittances"
      description="MoMo to MoMo remittances via PawaPay. Debits recipient-side float."
    >
      <AdminRemittances />
    </PageHeader>
  );
}
