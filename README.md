# Scriblic

A minimal, hand-drawn whiteboard app — unlimited named boards, saved to
Postgres, deployable on Vercel.

**New here? Start with [SETUP.md](./SETUP.md)** — it walks through Neon,
GitHub, and Vercel step by step.

Working on this in Claude Code? See [CLAUDE.md](./CLAUDE.md) for a project
map first.

## Quick reference

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL
npm run dev
```

## Features

- Rectangle, diamond, ellipse, line, arrow, freehand pen, text, eraser
- Hand-drawn "sketchy" rendering with three roughness styles
- Unlimited named boards, autosaved to Postgres
- Board-to-board links (drop a link element, double-click to jump)
- Image insert (drag-and-drop-free, via the toolbar), web page embeds
- Six canvas background colors, light/dark UI theme
- Undo/redo, duplicate, multi-select, pan/zoom
- Export to PNG, and Save As / Import as portable `.json` files
- Optional single-password protection for when it's deployed publicly
