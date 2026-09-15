import { AdminCheckoutLinks } from "@/components/admin/checkout-links";
import { AdminPage } from "@/components/admin/admin-page";

export default function AdminCheckoutsPage() {
  return (
    <AdminPage
      title="Pay links"
      description="Single-use checkout links. Payer still sends USDT."
    >
      <AdminCheckoutLinks />
    </AdminPage>
  );
}
