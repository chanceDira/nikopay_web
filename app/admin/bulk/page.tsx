import { AdminBulkPayouts } from "@/components/admin/bulk-payouts";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminBulkPage() {
  return (
    <PageHeader
      title="Bulk payouts"
      description="Pay up to 20 recipients from the PawaPay wallet. Not a USDT checkout."
    >
      <AdminBulkPayouts />
    </PageHeader>
  );
}
