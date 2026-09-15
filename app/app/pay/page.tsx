import { PayWizard } from "@/components/pay/pay-wizard";
import { PageHeader } from "@/components/shared/page-header";

export default function PayPage() {
  return (
    <PageHeader
      title="New payment"
      description="Send USDT. Recipient gets local currency on mobile money."
    >
      <PayWizard />
    </PageHeader>
  );
}
