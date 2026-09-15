import type { Metadata } from "next";
import { TermsContent } from "@/components/legal/terms-content";
import { MarketingShell } from "@/components/shared/marketing-shell";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "Terms for using NikoPay to send USDT and pay out on mobile money.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <TermsContent />
    </MarketingShell>
  );
}
