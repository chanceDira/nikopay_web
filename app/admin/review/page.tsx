import { AdminReviewQueue as ReviewQueue } from "@/components/admin/review-queue";
import { AdminPage } from "@/components/admin/admin-page";

export default function AdminReviewPage() {
  return (
    <AdminPage title="Review" description="Open intents">
      <ReviewQueue />
    </AdminPage>
  );
}
