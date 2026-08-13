import type { Metadata } from "next";
import { Afacad, Outfit } from "next/font/google";
import "./globals.css";

const afacad = Afacad({
  variable: "--font-afacad",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "NikoPay | Making Stablecoins Spendable",
  description:
    "Convert USDT to Rwandan Francs via MTN Mobile Money. Instant, transparent, non-custodial.",
  openGraph: {
    title: "NikoPay | Making Stablecoins Spendable",
    description:
      "Convert USDT to Rwandan Francs via MTN Mobile Money. Instant, transparent, non-custodial.",
    images: ["/nikopay-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${afacad.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
