import { NextResponse } from "next/server";
import { recordSnapshots, getStats, type SnapshotInput } from "@/lib/snapshotDb";

/** POST /api/snapshots  — record a batch of snapshots */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { snapshots: SnapshotInput[] };
    if (!Array.isArray(body.snapshots) || body.snapshots.length === 0) {
      return NextResponse.json({ error: "No snapshots provided" }, { status: 400 });
    }
    recordSnapshots(body.snapshots);
    const stats = getStats();
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** GET /api/snapshots  — return DB stats */
export async function GET() {
  try {
    const stats = getStats();
    return NextResponse.json(stats);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
