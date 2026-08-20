import { describe, expect, it } from "vitest";
import {
  adminAccessMessage,
  adminLoginPath,
  isAdminAccessReason,
} from "@/lib/admin-access";

describe("admin access helpers", () => {
  it("maps reasons to login paths and copy", () => {
    expect(isAdminAccessReason("wallet_changed")).toBe(true);
    expect(isAdminAccessReason("nope")).toBe(false);
    expect(adminLoginPath("wallet_changed")).toBe(
      "/admin/login?error=wallet_changed",
    );
    expect(adminAccessMessage("wallet_changed")).toContain("Wallet changed");
  });
});
