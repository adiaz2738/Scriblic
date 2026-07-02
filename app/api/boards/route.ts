import { NextResponse } from "next/server";
import { listBoards, createBoard } from "@/lib/boards";

export async function GET() {
  try {
    const boards = await listBoards();
    return NextResponse.json({ boards });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not load boards" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const board = await createBoard(body.name);
    return NextResponse.json({ board });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not create board" }, { status: 500 });
  }
}
