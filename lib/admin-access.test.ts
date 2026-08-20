import { describe, expect, it } from "vitest";
import {
  adminAccessMessage,
  adminLoginPath,
  isAdminAccessReason,
  shortWalletAddress,
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

  it("shortens wallet addresses", () => {
    expect(
      shortWalletAddress("0x0dfdb5bbaeece3871f826df1c6fe24a2772f5d38"),
    ).toBe("0x0dfd…5d38");
  });
});
