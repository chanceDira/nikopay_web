const DEFAULT_PUBLIC_SITE_URL = "https://nikopay-mvp.vercel.app";

/** Public https origin. Never localhost (emails, sitemap, metadataBase). */
export function resolvePublicSiteUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const candidates = [
    env.EMAIL_SITE_URL,
    env.NEXT_PUBLIC_SITE_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
    DEFAULT_PUBLIC_SITE_URL,
  ];

  for (const raw of candidates) {
    const normalized = normalizePublicOrigin(raw);
    if (normalized) {
      return normalized;
    }
  }

  return DEFAULT_PUBLIC_SITE_URL;
}

export function normalizePublicOrigin(
  value: string | undefined,
): string | null {
  if (!value?.trim()) {
    return null;
  }

  let raw = value.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return null;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}
