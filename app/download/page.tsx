import type { Metadata } from "next";
import { DownloadApp } from "@/components/landing/download-app";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

export const metadata: Metadata = {
  title: "Download the app",
  description:
    "Get the NikoPay mobile app for iOS and Android. Send USDT and pay out RWF on mobile money.",
  alternates: { canonical: "/download" },
};

export default function DownloadPage() {
  return (
    <>
      <Navbar />
      <main>
        <DownloadApp />
      </main>
      <Footer />
    </>
  );
}
