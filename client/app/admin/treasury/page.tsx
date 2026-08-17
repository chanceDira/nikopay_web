import { AdminTreasuryCards } from "@/components/admin/treasury-cards";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminTreasuryPage() {
  return (
    <PageHeader
      title="Treasury"
      description="Crypto balances and MoMo liquidity"
    >
      <AdminTreasuryCards />
    </PageHeader>
  );
}
