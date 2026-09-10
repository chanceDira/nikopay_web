import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi/spec";

export async function GET() {
  return NextResponse.json(buildOpenApiDocument(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
