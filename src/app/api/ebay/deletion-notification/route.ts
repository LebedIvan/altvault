export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

/**
 * eBay Marketplace Account Deletion/Closure Notification endpoint.
 * Required by eBay to activate the developer keyset.
 *
 * GET  — challenge verification (eBay verifies the endpoint is yours)
 * POST — receives deletion notifications (we acknowledge with 200)
 */

export async function GET(req: NextRequest) {
  const challengeCode = req.nextUrl.searchParams.get("challenge_code");

  if (!challengeCode) {
    return NextResponse.json({ error: "missing challenge_code" }, { status: 400 });
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;
  const endpointUrl       = `${process.env.NEXT_PUBLIC_BASE_URL}/api/ebay/deletion-notification`;

  if (!verificationToken) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  // eBay challenge response: sha256(challengeCode + verificationToken + endpointUrl)
  const hash = createHash("sha256")
    .update(challengeCode + verificationToken + endpointUrl)
    .digest("hex");

  return NextResponse.json({ challengeResponse: hash });
}

export async function POST() {
  // Acknowledge deletion notification — we don't store user data server-side
  return new NextResponse(null, { status: 200 });
}
