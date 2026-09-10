import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";
import { buildOpenApiDocument } from "@/lib/openapi/spec";

export async function GET(request: Request) {
  const admin = await authorizeAdmin(request);
  if (!admin.ok) {
    return jsonError(admin.reason, admin.status);
  }

  return NextResponse.json(buildOpenApiDocument(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
