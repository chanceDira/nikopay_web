import { AdminTreasuryCards } from "@/components/admin/treasury-cards";
import { AdminPage } from "@/components/admin/admin-page";

export default function AdminTreasuryPage() {
  return (
    <AdminPage title="Treasury" description="Vaults and PawaPay balance">
      <AdminTreasuryCards />
    </AdminPage>
  );
}
