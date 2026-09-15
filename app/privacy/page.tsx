import type { Metadata } from "next";
import { PrivacyContent } from "@/components/legal/privacy-content";
import { MarketingShell } from "@/components/shared/marketing-shell";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How NikoPay handles your data when you use the service.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <PrivacyContent />
    </MarketingShell>
  );
}
