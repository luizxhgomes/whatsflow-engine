import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    id: "user",
    name: "Builder User",
    email: "builder@example.com",
    image: null,
    isAnonymous: true,
    providerId: null,
  });
}

export async function PATCH() {
  return NextResponse.json({ success: true });
}
