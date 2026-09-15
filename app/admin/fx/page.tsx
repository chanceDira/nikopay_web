import { AdminFxForm } from "@/components/admin/fx-form";
import { AdminPage } from "@/components/admin/admin-page";

export default function AdminFxPage() {
  return (
    <AdminPage title="Exchange rates" description="Rates and fees">
      <AdminFxForm />
    </AdminPage>
  );
}
