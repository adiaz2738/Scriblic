import { notFound } from "next/navigation";
import { getBoardByShareToken } from "@/lib/boards";
import BoardViewer from "@/components/BoardViewer";

export const dynamic = "force-dynamic";

export default async function SharedBoardPage({ params }: { params: { token: string } }) {
  const board = await getBoardByShareToken(params.token);
  if (!board) notFound();
  return <BoardViewer board={board} />;
}
