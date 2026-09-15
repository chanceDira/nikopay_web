import { AdminRemittances } from "@/components/admin/remittances";
import { AdminPage } from "@/components/admin/admin-page";

export default function AdminRemittancesPage() {
  return (
    <AdminPage
      title="Remittances"
      description="MoMo to MoMo remittances via PawaPay. Debits recipient-side float."
    >
      <AdminRemittances />
    </AdminPage>
  );
}
