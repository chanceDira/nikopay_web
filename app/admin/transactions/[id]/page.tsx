import { PageHeader } from "@/components/shared/page-header";

type AdminTransactionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminTransactionDetailPage({
  params,
}: AdminTransactionDetailPageProps) {
  const { id } = await params;

  return (
    <PageHeader
      title="Transaction detail"
      description={`Details for payment ${id}`}
    />
  );
}
