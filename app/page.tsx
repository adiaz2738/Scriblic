import Dashboard from "@/components/Dashboard";
import { listBoards } from "@/lib/boards";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let boards: Awaited<ReturnType<typeof listBoards>> = [];
  let dbError: string | null = null;
  try {
    boards = await listBoards();
  } catch (err: any) {
    dbError = err.message || "Could not reach the database.";
  }
  return <Dashboard initialBoards={boards} dbError={dbError} />;
}
