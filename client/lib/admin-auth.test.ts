import { describe, expect, it } from "vitest";
import {
  ADMIN_COOKIE,
  buildAdminChallenge,
  createAdminCookieValue,
  parseAdminChallenge,
  readAdminCookieAddress,
  resolveAdminHmacSecret,
} from "@/lib/admin-auth";

const SECRET = "test-admin-secret";
const NOW = 1_700_000_000_000;
const ADDRESS = "0x0dfdb5bbaeece3871f826df1c6fe24a2772f5d38";

describe("admin challenge", () => {
  it("accepts a fresh stamped message", () => {
    const message = buildAdminChallenge(SECRET, NOW);
    expect(parseAdminChallenge(message, SECRET, NOW)).toEqual({ ok: true });
  });

  it("rejects a tampered stamp", () => {
    const message = buildAdminChallenge(SECRET, NOW).replace("1", "2");
    expect(parseAdminChallenge(message, SECRET, NOW).ok).toBe(false);
  });

  it("rejects an expired stamp", () => {
    const message = buildAdminChallenge(SECRET, NOW);
    expect(parseAdminChallenge(message, SECRET, NOW + 6 * 60 * 1000).ok).toBe(
      false,
    );
  });
});

describe("resolveAdminHmacSecret", () => {
  it("prefers admin session secret", () => {
    expect(
      resolveAdminHmacSecret({
        ADMIN_SESSION_SECRET: "admin",
        SETTLEMENT_INGEST_SECRET: "ingest",
        SUPABASE_SECRET_KEY: "supabase",
      }),
    ).toBe("admin");
  });

  it("falls back to supabase secret", () => {
    expect(
      resolveAdminHmacSecret({
        SUPABASE_SECRET_KEY: " supabase-secret ",
      }),
    ).toBe("supabase-secret");
  });

  it("returns null when no server secret is set", () => {
    expect(resolveAdminHmacSecret({})).toBeNull();
  });
});

describe("admin cookie", () => {
  it("reads a valid cookie", () => {
    const value = createAdminCookieValue(ADDRESS, SECRET, NOW);
    expect(
      readAdminCookieAddress(`${ADMIN_COOKIE}=${value}`, SECRET, NOW + 1000),
    ).toBe(ADDRESS);
  });

  it("rejects a forged cookie", () => {
    const value = createAdminCookieValue(ADDRESS, SECRET, NOW);
    expect(
      readAdminCookieAddress(
        `${ADMIN_COOKIE}=${value.slice(0, -2)}aa`,
        SECRET,
        NOW + 1000,
      ),
    ).toBeNull();
  });
});
