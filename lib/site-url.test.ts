import { describe, expect, it } from "vitest";
import { resolvePublicSiteUrl } from "@/lib/site-url";

describe("resolvePublicSiteUrl", () => {
  it("skips localhost and uses the production default", () => {
    expect(
      resolvePublicSiteUrl({
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toBe("https://nikopay-mvp.vercel.app");
  });

  it("prefers EMAIL_SITE_URL then a public NEXT_PUBLIC_SITE_URL", () => {
    expect(
      resolvePublicSiteUrl({
        EMAIL_SITE_URL: "https://nikopay-mvp.vercel.app",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toBe("https://nikopay-mvp.vercel.app");

    expect(
      resolvePublicSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://nikopay-mvp.vercel.app/",
      }),
    ).toBe("https://nikopay-mvp.vercel.app");
  });
});
