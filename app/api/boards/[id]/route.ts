import { NextResponse } from "next/server";
import { getBoard, updateBoard, deleteBoard } from "@/lib/boards";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const board = await getBoard(params.id);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ board });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not load board" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const patch = await req.json();
    const board = await updateBoard(params.id, patch);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ board });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not save board" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteBoard(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not delete board" }, { status: 500 });
  }
}
