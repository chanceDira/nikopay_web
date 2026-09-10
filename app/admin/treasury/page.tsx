import { AdminTreasuryCards } from "@/components/admin/treasury-cards";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminTreasuryPage() {
  return (
    <PageHeader title="Treasury" description="Vaults and PawaPay balance">
      <AdminTreasuryCards />
    </PageHeader>
  );
}
