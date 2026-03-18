import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/authServer";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  res.cookies.delete("vaulty_demo");
  return res;
}
