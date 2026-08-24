import type { Metadata } from "next";
import { PaymentReceipt } from "@/components/pay/payment-receipt";
import { PageHeader } from "@/components/shared/page-header";

type PaymentReceiptPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PaymentReceiptPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: {
      absolute: `NikoPay-receipt-${id}`,
    },
    description: `Payment receipt ${id}`,
  };
}

export default async function PaymentReceiptPage({
  params,
}: PaymentReceiptPageProps) {
  const { id } = await params;

  return (
    <PageHeader title="Receipt" description={`Receipt for payment ${id}`}>
      <PaymentReceipt id={id} />
    </PageHeader>
  );
}
