import { NextRequest, NextResponse } from "next/server";

const CHANNEL_MAP: Record<string, string> = {
  tiktok:    "tiktok",
  instagram: "instagram",
  twitter:   "twitter",
  youtube:   "youtube",
  telegram:  "telegram",
};

export function GET(
  req: NextRequest,
  { params }: { params: { channel: string } },
) {
  const src  = CHANNEL_MAP[params.channel] ?? params.channel;
  const lang = req.cookies.get("pref_lang")?.value ?? "en";
  const url  = new URL(`/${lang}`, req.url);
  url.searchParams.set("utm_source", src);

  return NextResponse.redirect(url, { status: 302 });
}
