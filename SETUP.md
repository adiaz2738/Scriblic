# Setup guide

This is a Next.js app. It stores your boards in a Postgres database on Neon,
and is built to deploy on Vercel. This walks through all three from scratch.
It assumes no prior experience with any of them.

Total time: ~20 minutes.

---

## 0. What you'll need

- Node.js 18 or newer installed locally (`node -v` to check)
- A free [GitHub](https://github.com) account
- A free [Vercel](https://vercel.com) account
- A free [Neon](https://neon.tech) account

---

## 1. Get the code onto your machine

If you already have a folder with this code, `cd` into it. Otherwise unzip
the project and open a terminal in that folder.

```bash
npm install
```

---

## 2. Create your Neon database

1. Go to [neon.tech](https://neon.tech) and sign up / log in.
2. Click **New Project**. Give it a name (e.g. `whiteboard`). Any region is fine.
3. Once it's created, you'll land on the project dashboard. Find the
   **Connection string** box. Make sure the dropdown next to it is set to
   the **pooled connection** (the hostname will contain `-pooler`).
4. Copy that connection string — it looks like:
   ```
   postgresql://user:password@ep-something-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. In the Neon dashboard, open the **SQL Editor** (left sidebar).
6. Open `schema.sql` from this project, copy its contents, paste them into
   the SQL Editor, and click **Run**. This creates the `boards` table.

---

## 3. Configure your local environment

1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and paste your Neon connection string as `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://user:password@ep-something-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Leave `APP_PASSWORD` blank for now (see [Password protection](#password-protection) below).

---

## 4. Run it locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see an empty
board dashboard. Click **New board** to create one and start drawing.

If you see "Can't reach the database," double-check `DATABASE_URL` and that
you ran `schema.sql` in step 2.6.

---

## 5. Push it to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
```

Then create a new empty repository on GitHub (no README/license — this
project already has one), and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## 6. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub
   repo you just pushed.
2. Vercel will auto-detect it as a Next.js app — no build settings to change.
3. Before deploying, open the **Environment Variables** section and add:
   - `DATABASE_URL` → the same Neon connection string from step 2.4
   - `APP_PASSWORD` → optional, see below
4. Click **Deploy**.

Once it finishes, you'll get a URL like `whiteboard-app.vercel.app`. That's
your live app.

Every time you `git push` to `main` from now on, Vercel redeploys automatically.

---

## Password protection

By default, if `APP_PASSWORD` is not set, the app is open to anyone with the
URL — fine for local testing, **not** fine once it's live with real client
work on it. To lock it down:

1. Set `APP_PASSWORD` to any password you choose, in both `.env.local` (for
   local dev) and in Vercel's project environment variables (for production).
2. Redeploy (Vercel → Deployments → Redeploy, or just push a commit).

This is a single shared password for the whole app, not per-user accounts —
appropriate for a personal tool, not a substitute for real auth if you ever
add other people to it.

---

## Known limitations, honestly stated

- **Images are stored as base64 inside the board's JSON**, which is simple
  but not efficient — a board with several photos will produce a large
  database row. Fine for diagrams and a handful of images; if you start
  pasting in lots of photos, the next upgrade is moving image storage to
  [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) and just
  storing a URL in the element instead of the base64 data. That's a
  contained change — swap the upload handler in `components/Whiteboard.tsx`
  to upload to Blob and store the returned URL.
- **Embeds** (the globe tool) rely on the target site allowing itself to be
  put in an iframe. Many sites block this (`X-Frame-Options`). Nothing to
  fix here — it's a property of the embedded site.
- **No real-time multi-user collaboration.** Autosave is per-browser-tab; if
  you have the same board open in two tabs, the last save wins. Fine for a
  single-person tool, which is what this is.
- **The password gate is intentionally simple** — one shared password, not
  individual accounts. If you ever need per-person logins, that's a bigger
  addition (e.g. NextAuth with Neon as the user store).

---

## Switching to Supabase later

The only Neon-specific code lives in `lib/db.ts` (creates the SQL client)
and `lib/boards.ts` (uses it via tagged-template queries). To move to
Supabase's Postgres:

1. `npm install postgres` (or `@supabase/supabase-js` if you want to also
   use Supabase's auth/storage/realtime features, not just the database).
2. Replace `lib/db.ts`'s `getSql()` to build a client from the `postgres`
   package pointed at your Supabase connection string instead of
   `@neondatabase/serverless`.
3. `lib/boards.ts`'s queries are written as plain tagged-template SQL, so
   they should work unchanged against `postgres` — the API is very similar.
4. Update `DATABASE_URL` to your Supabase connection string, everywhere.

The `boards` table schema (`schema.sql`) is plain Postgres — no Neon-specific
features — so it works as-is on Supabase.

---

## Where to take this next (good Claude Code tasks)

See `CLAUDE.md` for a project-structure brief written for handing this off
to Claude Code. A few concrete next steps if you want ideas:

- Move image storage to Vercel Blob (see above)
- Add board thumbnails to the dashboard cards
- Add a "duplicate board" action
- Add full-text search across board names/content
- Add per-board sharing links with read-only access
