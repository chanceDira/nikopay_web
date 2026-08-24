import { describe, expect, it } from "vitest";
import { resolvePublicSiteUrl } from "@/lib/site-url";

describe("resolvePublicSiteUrl", () => {
  it("skips localhost and uses nikopay.rw", () => {
    expect(
      resolvePublicSiteUrl({
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toBe("https://nikopay.rw");
  });

  it("skips vercel.app hosts and uses nikopay.rw", () => {
    expect(
      resolvePublicSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://nikopay-mvp.vercel.app",
        EMAIL_SITE_URL: "https://nikopay-git-0xj11.vercel.app",
      }),
    ).toBe("https://nikopay.rw");
  });

  it("prefers EMAIL_SITE_URL then a public NEXT_PUBLIC_SITE_URL", () => {
    expect(
      resolvePublicSiteUrl({
        EMAIL_SITE_URL: "https://nikopay.rw",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toBe("https://nikopay.rw");

    expect(
      resolvePublicSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://nikopay.rw/",
      }),
    ).toBe("https://nikopay.rw");
  });
});
