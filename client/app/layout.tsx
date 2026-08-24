import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const afacad = Afacad({
  variable: "--font-afacad",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const siteUrl = resolvePublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NikoPay | Making Stablecoins Spendable",
    template: "%s | NikoPay",
  },
  description:
    "Convert USDT to Rwandan Francs via MTN Mobile Money. Instant, transparent, non-custodial.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "NikoPay",
    title: "NikoPay | Making Stablecoins Spendable",
    description:
      "Convert USDT to Rwandan Francs via MTN Mobile Money. Instant, transparent, non-custodial.",
    images: ["/nikopay-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "NikoPay | Making Stablecoins Spendable",
    description:
      "Convert USDT to Rwandan Francs via MTN Mobile Money. Instant, transparent, non-custodial.",
    images: ["/nikopay-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
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
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('nikopay_theme') || 'dark';
                  if (theme === 'light') {
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.remove('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
