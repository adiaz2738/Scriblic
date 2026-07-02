import { randomUUID } from "crypto";
import { getSql } from "./db";

export type BoardSummary = {
  id: string;
  name: string;
  updatedAt: string;
};

export type Board = {
  id: string;
  name: string;
  canvasBg: string;
  elements: any[];
  createdAt: string;
  updatedAt: string;
};

function rowToBoard(row: any): Board {
  return {
    id: row.id,
    name: row.name,
    canvasBg: row.canvas_bg,
    elements: row.elements ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listBoards(): Promise<BoardSummary[]> {
  const sql = getSql();
  const rows = await sql`select id, name, updated_at from boards order by updated_at desc`;
  return rows.map((r: any) => ({ id: r.id, name: r.name, updatedAt: r.updated_at }));
}

export async function getBoard(id: string): Promise<Board | null> {
  const sql = getSql();
  const rows = await sql`select * from boards where id = ${id} limit 1`;
  if (rows.length === 0) return null;
  return rowToBoard(rows[0]);
}

export async function createBoard(name: string): Promise<Board> {
  const sql = getSql();
  const id = randomUUID();
  const rows = await sql`
    insert into boards (id, name, canvas_bg, elements)
    values (${id}, ${name || "Untitled board"}, '#FFFFFF', '[]'::jsonb)
    returning *
  `;
  return rowToBoard(rows[0]);
}

export async function updateBoard(
  id: string,
  patch: { name?: string; canvasBg?: string; elements?: any[] }
): Promise<Board | null> {
  const sql = getSql();
  const rows = await sql`
    update boards set
      name = coalesce(${patch.name ?? null}, name),
      canvas_bg = coalesce(${patch.canvasBg ?? null}, canvas_bg),
      elements = coalesce(${patch.elements ? JSON.stringify(patch.elements) : null}::jsonb, elements),
      updated_at = now()
    where id = ${id}
    returning *
  `;
  if (rows.length === 0) return null;
  return rowToBoard(rows[0]);
}

export async function deleteBoard(id: string): Promise<void> {
  const sql = getSql();
  await sql`delete from boards where id = ${id}`;
}
