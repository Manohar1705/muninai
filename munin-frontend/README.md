# Munin — frontend

The agent that remembers everything. This is the React frontend for the
Munin demo, wired to the `munin-backend` API — no more client-side seed
data or simulated chat matching.

## Run it

This needs the backend running first (see `../munin-backend/README.md`):

```bash
cd ../munin-backend
npm install
cp .env.example .env
npm start          # http://localhost:4000
```

Then, in this folder:

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). On load the app
fetches the dashboard, sessions, knowledge base, coverage, and SME map from
the backend — if it can't reach it, you'll see a "Couldn't reach the Munin
backend" screen with a Retry button instead of a blank/broken UI.

If the backend isn't running on `http://localhost:4000`, copy `.env.example`
to `.env` and set `VITE_API_BASE` accordingly.

## What's in here

- `src/App.jsx` — the entire app: design tokens, the API client, and all six
  pages (Dashboard, Sessions, Knowledge Base, Coverage, SME Map, Ask Munin).
- `src/main.jsx` — mounts the app.
- `src/index.css` — minimal global reset.

## How it's wired to the backend

- All list/detail data (dashboard stats, sessions, knowledge objects,
  coverage/gaps, SME map) is fetched from `/api/...` on mount via a small
  `api` client at the top of `App.jsx`.
- **Sessions**: the list view shows lightweight session rows; clicking one
  (or following a "View in transcript" link from the Knowledge Base) fetches
  the full session — including transcript and extracted knowledge objects —
  from `GET /api/sessions/:id`.
- **Upload flow**: the animated "Transcribing → Extracting → Indexing" UI
  still runs client-side for the visual moment, then calls
  `POST /api/sessions/upload` when it finishes and merges the real response
  (new session, knowledge objects, updated readiness, closed gap) into
  state.
- **Ask Munin**: chat history loads from `GET /api/chat/history`; sending a
  message calls `POST /api/chat` and renders the real `reply` / `citation` /
  `isGap`. If a gap gets logged, Coverage data is refreshed in the
  background so the gap count updates without a page reload.
- **Reset demo data**: the sidebar's "Reset demo data" control calls
  `POST /api/settings/reset`, then refetches everything — this is what makes
  the full demo (including the upload "wow moment") repeatable.

## Known limitations (by design, for now)

- No auth beyond the backend's fake click-through SSO endpoint — this app
  doesn't call it or gate any pages behind it, since it's a single-user demo.
- No optimistic UI / retry queue for failed writes (upload, chat, reset) —
  failures show a plain `alert()` for now.

## Next steps

Verification (click through all six pages end-to-end, including a gap-
logging chat question, the upload flow, and reset), then push to GitHub.
