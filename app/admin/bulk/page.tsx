import { AdminBulkPayouts } from "@/components/admin/bulk-payouts";
import { AdminPage } from "@/components/admin/admin-page";

export default function AdminBulkPage() {
  return (
    <AdminPage
      title="Bulk payouts"
      description="Pay up to 20 recipients from the PawaPay wallet. Not a USDT checkout."
    >
      <AdminBulkPayouts />
    </AdminPage>
  );
}
