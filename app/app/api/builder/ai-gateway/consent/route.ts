import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: false,
    hasManagedKey: false,
    error: "AI Gateway not configured",
  });
}
