import { AdminReviewQueue as ReviewQueue } from "@/components/admin/review-queue";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminReviewPage() {
  return (
    <PageHeader title="Review" description="Payments that need manual review">
      <ReviewQueue />
    </PageHeader>
  );
}
