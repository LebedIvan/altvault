export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, isDemoRequest } from "@/lib/authServer";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (user) return NextResponse.json({ mode: "user", user });

  if (isDemoRequest(req)) return NextResponse.json({ mode: "demo", user: null });

  return NextResponse.json({ mode: "none", user: null }, { status: 401 });
}
