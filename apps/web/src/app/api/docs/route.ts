import { openapiSpec } from "@/lib/openapi-spec";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(openapiSpec, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
