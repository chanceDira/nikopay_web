import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How NikoPay handles your data when you use the service.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <div className="border-b border-niko-border px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-sm text-niko-muted transition-colors hover:text-niko-teal"
        >
          Back to home
        </Link>
      </div>
      <PageHeader
        title="Privacy policy"
        description="How NikoPay handles your data"
      />
    </main>
  );
}
