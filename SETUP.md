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

## 3. Set up Vercel Blob (image storage)

Images you insert on a board are uploaded to [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
rather than stored inline, so you need a Blob store connected before image
uploads will work.

1. Go to your project on [vercel.com](https://vercel.com) (if you haven't
   created/imported it yet, you can come back to this after step 6 below —
   just leave `BLOB_READ_WRITE_TOKEN` blank for now).
2. Open the **Storage** tab and click **Create Database** → **Blob**.
3. Give the store a name and connect it to this project. Vercel will
   automatically inject `BLOB_READ_WRITE_TOKEN` into your project's
   production and preview environments — no manual copy-pasting needed there.
4. For local development, pull that value down instead of typing it by hand:
   ```bash
   npx vercel link
   npx vercel env pull .env.local
   ```
   This fills in `BLOB_READ_WRITE_TOKEN` (and `DATABASE_URL`, if you've also
   added it in Vercel) in your local `.env.local`.

If you'd rather configure `.env.local` by hand before connecting Vercel,
that's fine too — just leave `BLOB_READ_WRITE_TOKEN` blank until step 3.3
above gives you a token to paste in.

---

## 4. Configure your local environment

1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and paste your Neon connection string as `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://user:password@ep-something-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Paste your Blob token as `BLOB_READ_WRITE_TOKEN` (from step 3 above), or
   run `vercel env pull .env.local` to fetch it automatically.
4. Leave `APP_PASSWORD` blank for now (see [Password protection](#password-protection) below).

---

## 5. Run it locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see an empty
board dashboard. Click **New board** to create one and start drawing.

If you see "Can't reach the database," double-check `DATABASE_URL` and that
you ran `schema.sql` in step 2.6. If inserting an image fails, double-check
`BLOB_READ_WRITE_TOKEN`.

---

## 6. Push it to GitHub

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

## 7. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub
   repo you just pushed.
2. Vercel will auto-detect it as a Next.js app — no build settings to change.
3. Before deploying, open the **Environment Variables** section and add:
   - `DATABASE_URL` → the same Neon connection string from step 2.4
   - `APP_PASSWORD` → optional, see below
   - `BLOB_READ_WRITE_TOKEN` → only needed here if you didn't connect the
     Blob store to this project already in step 3 (in which case Vercel
     already injected it for you)
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

- **Images upload to Vercel Blob and store a URL** in the board's JSON.
  Deleting an image element from a board does not currently delete its
  underlying Blob object, so removed images leave an orphaned file behind —
  a reasonable cleanup task later, not a functional problem today.
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

- Clean up orphaned Blob files when an image element is deleted
- Add board thumbnails to the dashboard cards
- Add a "duplicate board" action
- Add full-text search across board names/content
- Add per-board sharing links with read-only access
