import { AdminTransactionsTable } from "@/components/admin/transactions-table";
import { AdminPage } from "@/components/admin/admin-page";

export default function AdminTransactionsPage() {
  return (
    <AdminPage title="Transactions" description="Payment intents">
      <AdminTransactionsTable />
    </AdminPage>
  );
}
