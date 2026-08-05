import { NextResponse } from "next/server";
import {
  createApiKey,
  listApiKeys,
} from "@/lib/builder/mock-api-keys";

export async function GET() {
  return NextResponse.json(listApiKeys());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name : "API Key";
  const entry = createApiKey(name);
  return NextResponse.json(entry);
}
