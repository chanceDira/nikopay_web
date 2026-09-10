import { AdminTransactionsTable } from "@/components/admin/transactions-table";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminTransactionsPage() {
  return (
    <PageHeader title="Transactions" description="Payment intents">
      <AdminTransactionsTable />
    </PageHeader>
  );
}
