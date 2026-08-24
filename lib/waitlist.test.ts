import { describe, expect, it } from "vitest";
import { parseWaitlistSignup } from "@/lib/waitlist";

describe("parseWaitlistSignup", () => {
  it("normalizes email and optional role", () => {
    expect(
      parseWaitlistSignup({ email: "  Ada@Niko.Pay ", role: "freelancer" }),
    ).toEqual({
      ok: true,
      signup: { email: "ada@niko.pay", role: "freelancer" },
    });
  });

  it("allows a missing role", () => {
    expect(parseWaitlistSignup({ email: "ada@niko.pay" })).toEqual({
      ok: true,
      signup: { email: "ada@niko.pay", role: null },
    });
  });

  it("rejects invalid email and unknown role", () => {
    expect(parseWaitlistSignup({ email: "not-an-email" }).ok).toBe(false);
    expect(
      parseWaitlistSignup({ email: "ada@niko.pay", role: "admin" }).ok,
    ).toBe(false);
  });
});
