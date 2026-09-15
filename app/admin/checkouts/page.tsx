import { AdminCheckoutLinks } from "@/components/admin/checkout-links";
import { AdminPage } from "@/components/admin/admin-page";

export default function AdminCheckoutsPage() {
  return (
    <AdminPage
      title="Pay links"
      description="Single-use payout links. Share the URL so someone else can pay USDT to your recipient."
    >
      <AdminCheckoutLinks />
    </AdminPage>
  );
}
