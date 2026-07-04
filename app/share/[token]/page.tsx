import { notFound } from "next/navigation";
import { getBoardByShareToken } from "@/lib/boards";
import BoardViewer from "@/components/BoardViewer";

export const dynamic = "force-dynamic";

export default async function SharedBoardPage({ params, searchParams }: { params: { token: string }; searchParams: { mode?: string } }) {
  const board = await getBoardByShareToken(params.token);
  if (!board) notFound();
  const dynamicMode = searchParams.mode === "dynamic";
  return <BoardViewer board={board} dynamic={dynamicMode} />;
}
