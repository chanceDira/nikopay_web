import { AdminCollections } from "@/components/admin/collections";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminCollectionsPage() {
  return (
    <PageHeader
      title="Collections"
      description="Request mobile-money deposits into the PawaPay float. Not a USDT offramp."
    >
      <AdminCollections />
    </PageHeader>
  );
}
