import { StatusTimeline } from "@/components/pay/status-timeline";
import { PageHeader } from "@/components/shared/page-header";

type PaymentStatusPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PaymentStatusPage({
  params,
}: PaymentStatusPageProps) {
  const { id } = await params;

  return (
    <PageHeader
      title="Payment status"
      description={`Track payment ${id}`}
    >
      <StatusTimeline />
    </PageHeader>
  );
}
