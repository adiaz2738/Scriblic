# CLAUDE.md

Context for working on this project in Claude Code.

## What this is

A minimal, hand-drawn-style whiteboard app (Excalidraw-like) with unlimited
named boards, persisted to Postgres (Neon), deployed on Vercel. Single-user
tool, no real-time collaboration.

## Stack

- **Next.js 14** (App Router), mixed TypeScript (`app/`, `lib/`) and JS/TSX
  for the drawing engine (`components/Whiteboard.tsx` — kept as loosely-typed
  JS-in-TSX since it's a canvas-heavy component where strict typing every
  element variant would slow iteration more than it'd help).
- **@neondatabase/serverless** for Postgres access (HTTP-based driver, no
  connection pooling to manage).
- **@vercel/blob** for image storage — uploads go through
  `app/api/upload/route.ts`, which stores the file and returns a URL for
  the image element's `src`.
- **lucide-react** for icons. No CSS framework — everything is inline styles
  plus a small `<style>` block per component. This is intentional, matching
  the original design; don't introduce Tailwind unless you're doing a
  deliberate visual overhaul.

## File map

```
app/
  page.tsx                 dashboard (server component, lists boards)
  board/[id]/page.tsx       server component, fetches one board, renders Whiteboard
  login/page.tsx            password gate UI (only relevant if APP_PASSWORD set)
  api/boards/route.ts        GET (list) / POST (create)
  api/boards/[id]/route.ts   GET / PUT (save) / DELETE
  api/upload/route.ts        POST — uploads an image to Vercel Blob, returns { url }
  api/login/route.ts         checks APP_PASSWORD, sets cookie
  layout.tsx, globals.css
components/
  Dashboard.tsx              client component behind app/page.tsx
  Whiteboard.tsx              the whole drawing engine — tools, canvas, panels
lib/
  db.ts                      lazy Neon client (getSql())
  boards.ts                  all DB queries (listBoards, getBoard, createBoard, updateBoard, deleteBoard)
middleware.ts                 password-gate middleware (no-op if APP_PASSWORD unset)
schema.sql                    the one table this app uses
```

## Data model

One table, `boards`:

```sql
id text primary key            -- uuid
name text
canvas_bg text                 -- hex color for the board's background
elements jsonb                 -- array of shape objects, see below
created_at / updated_at
```

`elements` is a JSON array. Each element has a `type`:
`rectangle | diamond | ellipse | line | arrow | freehand | text | image | embed | link`.
Shape geometry conventions:
- `rectangle`/`diamond`/`ellipse`/`text`/`image`/`embed`/`link`: `{x, y, w, h}` (text uses `width`/`height` instead of `w`/`h` — a known inconsistency, see note below)
- `line`/`arrow`/`freehand`: `{points: [{x,y}, ...]}`

All the geometry, hit-testing, and sketchy-line rendering logic lives at the
top of `components/Whiteboard.tsx` as plain functions (`getBBox`,
`hitTestPoint`, `sketchyPath`, etc.) above the component itself — read those
first if you're adding a new shape type.

**Known wart:** text elements use `width`/`height` fields while every other
box-shaped element uses `w`/`h`. `getBBox` and `hitTestPoint` special-case
`text` to handle this. If you ever touch text sizing, keep that special case
or normalize the field names project-wide (touches element creation,
`getBBox`, `hitTestPoint`, and the resize-handle logic).

## How persistence works

- Each board page (`app/board/[id]/page.tsx`) does a server-side fetch of
  the board's full data (including `elements`) directly via `lib/boards.ts`
  — no client-side loading spinner on first paint.
- `Whiteboard.tsx` debounces autosave (700ms after the last change) via
  `PUT /api/boards/:id`.
- Switching boards (via the top-left picker or a link element) calls
  `saveNow()` to flush the current board first, then `router.push`s to the
  new board's URL — the page remounts server-side with fresh data.
- There's a `saveStatus` indicator (bottom-right, small mono text) — useful
  when debugging save issues.

## Known limitations (see SETUP.md for the user-facing version)

- Images now upload to Vercel Blob and only a URL is stored in the
  `elements` jsonb column. Deleting an image element does not currently
  delete its Blob object, so an orphaned file is left behind — a good
  future cleanup task, not something to fix now.
- Embeds (`type: "embed"`) render an `<iframe>` — many sites block this via
  `X-Frame-Options`. Not fixable from this side.
- No realtime collaboration. Last write wins if the same board is open in
  two tabs.
- `APP_PASSWORD` auth is a single shared password via a cookie check in
  `middleware.ts`, not per-user accounts.

## Conventions to keep

- Inline styles, not Tailwind/CSS modules — stay consistent with the
  existing components if you add new ones.
- Theme is a plain `{ appBg, panelBg, panelBorder, ink, muted, hover, hud,
  shadow }` object (`LIGHT`/`DARK` in `Whiteboard.tsx`, duplicated in
  `Dashboard.tsx` — if you touch the palette, update both).
- Undo/redo is a simple past/future array of full `elements` snapshots
  (`beginChange()`/`endChange()` bracket any mutation you want undoable).
  Follow that pattern for new mutations rather than inventing a new one.
