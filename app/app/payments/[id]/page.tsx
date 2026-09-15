import { StatusTimeline } from "@/components/pay/status-timeline";

type PaymentStatusPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PaymentStatusPage({
  params,
}: PaymentStatusPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Payment status
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-niko-muted">
        Track this payout from deposit to mobile money.
      </p>
      <div className="mt-8">
        <StatusTimeline id={id} />
      </div>
    </div>
  );
}
