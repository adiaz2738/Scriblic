import { NextResponse } from "next/server";
import { setBoardSharing } from "@/lib/boards";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { isPublic } = await req.json();
    const board = await setBoardSharing(params.id, !!isPublic);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ board });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not update sharing" }, { status: 500 });
  }
}
