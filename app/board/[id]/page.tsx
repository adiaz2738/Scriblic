import { notFound } from "next/navigation";
import { getBoard, listBoards } from "@/lib/boards";
import Whiteboard from "@/components/Whiteboard";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: { id: string } }) {
  const board = await getBoard(params.id);
  if (!board) notFound();
  const boardList = await listBoards();
  return <Whiteboard board={board} boardList={boardList} />;
}
