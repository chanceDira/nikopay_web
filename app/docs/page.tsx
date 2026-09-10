import type { Metadata } from "next";
import { SwaggerDocs } from "@/components/docs/swagger-docs";

export const metadata: Metadata = {
  title: {
    absolute: "API",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function DocsPage() {
  return <SwaggerDocs />;
}
