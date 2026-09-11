import { PayWizard } from "@/components/pay/pay-wizard";
import { PageHeader } from "@/components/shared/page-header";
import { loadPublicCheckout } from "@/lib/checkouts";

type CheckoutPageProps = {
  params: Promise<{ token: string }>;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { token } = await params;
  const result = await loadPublicCheckout(token);

  if (!result.ok) {
    return (
      <PageHeader
        title="Pay link unavailable"
        description="This link is expired, used, or was revoked."
      />
    );
  }

  return (
    <PageHeader
      title="Pay"
      description="Send USDT. Recipient gets mobile money."
    >
      <PayWizard checkout={result.checkout} />
    </PageHeader>
  );
}
