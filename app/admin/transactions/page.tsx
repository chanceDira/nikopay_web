import { AdminTransactionsTable } from "@/components/admin/transactions-table";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminTransactionsPage() {
  return (
    <PageHeader
      title="Transactions"
      description="Monitor and inspect payment intents."
    >
      <AdminTransactionsTable />
    </PageHeader>
  );
}
