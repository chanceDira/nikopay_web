import { AdminCheckoutLinks } from "@/components/admin/checkout-links";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminCheckoutsPage() {
  return (
    <PageHeader
      title="Pay links"
      description="Single-use checkout links. Payer still sends USDT."
    >
      <AdminCheckoutLinks />
    </PageHeader>
  );
}
