import type { Metadata } from "next";
import { DownloadApp } from "@/components/landing/download-app";
import { MarketingShell } from "@/components/shared/marketing-shell";

export const metadata: Metadata = {
  title: "Download the app",
  description:
    "Get the NikoPay iOS and Android app as it rolls out. Send USDT, pay out local currency on mobile money.",
  alternates: { canonical: "/download" },
};

export default function DownloadPage() {
  return (
    <MarketingShell>
      <DownloadApp />
    </MarketingShell>
  );
}
