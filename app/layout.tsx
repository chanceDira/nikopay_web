import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { resolvePublicSiteUrl } from "@/lib/site-url";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = resolvePublicSiteUrl();

const title = "NikoPay | Making stablecoins spendable";
const description =
  "Send stablecoins from your wallet. Recipients get local currency on mobile money across Africa. Transparent rates and fees before you confirm.";

const brandImage = {
  url: "/og-image.png",
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
    "mobile money",
    "stablecoin offramp",
    "crypto to mobile money",
    "Africa",
    "PawaPay",
  ],
  authors: [{ name: "NikoPay", url: siteUrl }],
  creator: "NikoPay",
  publisher: "NikoPay",
  category: "finance",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "1254x1254" }],
    shortcut: "/favicon.ico",
    apple: [{ url: "/og-image.png", type: "image/png", sizes: "1254x1254" }],
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
    card: "summary",
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
      className={`${outfit.variable} h-full antialiased`}
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
