import type { Metadata } from "next";
import { Afacad, Outfit } from "next/font/google";
import { resolvePublicSiteUrl } from "@/lib/site-url";
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

const title = "NikoPay | Making Stablecoins Spendable";
const description =
  "Convert USDT to Rwandan Francs via MTN Mobile Money. Instant, transparent, non-custodial.";

const brandImage = {
  url: "/favicon.ico",
  width: 1254,
  height: 1254,
  alt: "NikoPay",
  type: "image/png",
} as const;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "NikoPay",
  title: {
    default: title,
    template: "%s | NikoPay",
  },
  description,
  keywords: [
    "NikoPay",
    "USDT",
    "MTN MoMo",
    "Mobile Money",
    "Rwanda",
    "RWF",
    "stablecoin",
    "offramp",
  ],
  authors: [{ name: "NikoPay", url: siteUrl }],
  creator: "NikoPay",
  publisher: "NikoPay",
  category: "finance",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/favicon.ico", type: "image/png", sizes: "1254x1254" }],
    shortcut: "/favicon.ico",
    apple: [{ url: "/favicon.ico", type: "image/png", sizes: "1254x1254" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "NikoPay",
    title,
    description,
    images: [brandImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [brandImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
