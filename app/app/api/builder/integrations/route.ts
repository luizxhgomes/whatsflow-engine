import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function GET() {
  return NextResponse.json([]);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    id: nanoid(),
    name: body?.name ?? "Integration",
    type: body?.type ?? "custom",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
