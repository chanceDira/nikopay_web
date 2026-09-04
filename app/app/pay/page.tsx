import { PayWizard } from "@/components/pay/pay-wizard";
import { PageHeader } from "@/components/shared/page-header";

export default function PayPage() {
  return (
    <PageHeader
      title="New payment"
      description="Create a USDT to mobile money payment"
    >
      <PayWizard />
    </PageHeader>
  );
}
