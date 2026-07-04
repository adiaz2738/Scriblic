"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, AlertTriangle, Check, X } from "lucide-react";

const LIGHT = { appBg: "#F6F6F3", panelBg: "#FFFFFF", panelBorder: "#E6E6E1", ink: "#232326", muted: "#9A9AA2", hover: "#F0F0EE" };
const DARK = { appBg: "#1B1B1D", panelBg: "#202023", panelBorder: "#3A3A3E", ink: "#EDEDEC", muted: "#8F8F96", hover: "#2B2B2F" };

// Must match the "Slate" entry in CANVAS_BACKGROUNDS in Whiteboard.tsx — new
// boards created while in dark mode get this instead of the server's default
// white, so they don't flash white before the user ever sees them.
const DARK_CANVAS_BG = "#20232B";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Dashboard({ initialBoards, dbError }: { initialBoards: any[]; dbError: string | null }) {
  const router = useRouter();
  const [boards, setBoards] = useState(initialBoards);
  const [isDark, setIsDark] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createBoardError, setCreateBoardError] = useState<string | null>(null);
  const theme = isDark ? DARK : LIGHT;

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("board-theme") : null;
    if (saved === "dark") setIsDark(true);
  }, []);

  async function refresh() {
    try {
      const res = await fetch("/api/boards");
      const data = await res.json();
      if (data.boards) setBoards(data.boards);
    } catch (e) {
      /* keep showing what we have */
    }
  }

  async function createBoard() {
    console.log("[addProject] called from", new Error().stack);
    setBusy(true);
    setCreateBoardError(null);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled board" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.board) {
        setCreateBoardError(data.error || "Something went wrong creating the board.");
        return;
      }
      if (isDark) {
        await fetch(`/api/boards/${data.board.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canvasBg: DARK_CANVAS_BG }),
        }).catch(() => {});
      }
      router.push(`/board/${data.board.id}`);
    } catch (e) {
      setCreateBoardError("Something went wrong creating the board.");
    } finally {
      setBusy(false);
    }
  }

  async function renameBoard(id: string, name: string) {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, name } : b)));
    try {
      await fetch(`/api/boards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } catch (e) {
      refresh();
    }
  }

  async function deleteBoard(id: string) {
    const prev = boards;
    setBoards((b) => b.filter((x) => x.id !== id));
    try {
      await fetch(`/api/boards/${id}`, { method: "DELETE" });
    } catch (e) {
      setBoards(prev);
    }
  }

  function toggleTheme() {
    setIsDark((d) => {
      const next = !d;
      window.localStorage.setItem("board-theme", next ? "dark" : "light");
      return next;
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: theme.appBg, fontFamily: "'Inter', -apple-system, sans-serif" }} onClick={() => setConfirmDeleteId(null)}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: theme.muted }}>
            Scriblic
          </div>
          <button
            onClick={toggleTheme}
            style={{ fontSize: 12, color: theme.muted, background: "none", border: `1px solid ${theme.panelBorder}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}
          >
            {isDark ? "Light" : "Dark"}
          </button>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: theme.ink, margin: "0 0 28px" }}>Your boards</h1>

        {dbError && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#FCEAEA", border: "1px solid #F3C6C6", borderRadius: 12, padding: 14, marginBottom: 24, fontSize: 13, color: "#8A2E32" }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Can't reach the database</div>
              <div style={{ opacity: 0.85 }}>{dbError} Check DATABASE_URL in your environment variables and make sure schema.sql has been run — see SETUP.md.</div>
            </div>
          </div>
        )}

        {createBoardError && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#FCEAEA", border: "1px solid #F3C6C6", borderRadius: 12, padding: 14, marginBottom: 24, fontSize: 13, color: "#8A2E32" }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Couldn't create the board</div>
              <div style={{ opacity: 0.85, marginBottom: 8 }}>{createBoardError}</div>
              <button
                onClick={createBoard}
                disabled={busy}
                style={{ fontSize: 12, fontWeight: 600, color: "#8A2E32", background: "white", border: "1px solid #F3C6C6", borderRadius: 8, padding: "5px 10px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}
              >
                Try again
              </button>
            </div>
            <button
              onClick={() => setCreateBoardError(null)}
              title="Dismiss"
              style={{ flexShrink: 0, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", borderRadius: 6, cursor: "pointer", color: "#8A2E32" }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <button
          onClick={createBoard}
          disabled={busy || !!dbError}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            background: "#4C5FF7",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            cursor: busy || dbError ? "default" : "pointer",
            opacity: busy || dbError ? 0.5 : 1,
            marginBottom: 28,
          }}
        >
          <Plus size={16} /> New board
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {boards.map((b) => (
            <div
              key={b.id}
              style={{ background: theme.panelBg, border: `1px solid ${theme.panelBorder}`, borderRadius: 14, padding: 16, cursor: "pointer" }}
              onClick={() => {
                setConfirmDeleteId(null);
                if (renamingId !== b.id) router.push(`/board/${b.id}`);
              }}
            >
              <div style={{ height: 64, borderRadius: 8, background: theme.hover, marginBottom: 12 }} />
              {renamingId === b.id ? (
                <input
                  autoFocus
                  defaultValue={b.name}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => { renameBoard(b.id, e.target.value.trim() || "Untitled board"); setRenamingId(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  style={{ font: "inherit", fontSize: 14, fontWeight: 600, color: theme.ink, background: "transparent", border: "none", borderBottom: "1px solid #4C5FF7", outline: "none", width: "100%", marginBottom: 4 }}
                />
              ) : (
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.ink, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: theme.muted, fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo(b.updatedAt)}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {confirmDeleteId === b.id ? (
                    <>
                      <span style={{ fontSize: 11, color: "#E5484D", fontWeight: 600, marginRight: 2 }}>Delete?</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); deleteBoard(b.id); }}
                        title="Confirm delete"
                        style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", borderRadius: 6, cursor: "pointer", color: "#E5484D" }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        title="Cancel"
                        style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", borderRadius: 6, cursor: "pointer", color: theme.muted }}
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenamingId(b.id); }}
                        style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", borderRadius: 6, cursor: "pointer", color: theme.muted }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(b.id); }}
                        style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", borderRadius: 6, cursor: "pointer", color: theme.muted }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {boards.length === 0 && !dbError && (
          <div style={{ fontSize: 13, color: theme.muted, marginTop: 12 }}>No boards yet — create your first one above.</div>
        )}
      </div>
    </div>
  );
}
