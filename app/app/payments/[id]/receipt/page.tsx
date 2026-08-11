import { PaymentReceipt } from "@/components/pay/payment-receipt";
import { PageHeader } from "@/components/shared/page-header";

type PaymentReceiptPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PaymentReceiptPage({
  params,
}: PaymentReceiptPageProps) {
  const { id } = await params;

  return (
    <PageHeader title="Receipt" description={`Receipt for payment ${id}`}>
      <PaymentReceipt />
    </PageHeader>
  );
}
