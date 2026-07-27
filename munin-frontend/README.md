# Munin — frontend

The agent that remembers everything. This is the React frontend for the
Munin platform, wired to the `munin-backend` API — no client-side seed data
or simulated logic; every screen fetches, mutates, and caches through the
real backend.

## Run it

This needs the backend running first (see `../munin-backend/README.md`):

```bash
cd ../munin-backend
npm install
cp .env.example .env
npm run dev        # http://localhost:4000
```

Then, in this folder:

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

If the backend isn't running on `http://localhost:4000`, copy `.env.example`
to `.env` and set `VITE_API_BASE` accordingly:

```env
VITE_API_BASE=http://localhost:4000/api
```

## Architecture

The app is organized as **feature-based modules**, not one large file. Each
feature owns its own API calls, hooks, and UI — nothing is scattered across
a single monolithic component.

```text
src/
  app/
    App.jsx              Route table + layout shell (Sidebar, header, config banner)
  main.jsx                Mounts React, BrowserRouter, and the React Query client
  shared/
    api/client.js         Generic fetch wrapper (apiRequest, apiRequestSoft, apiUpload)
    components/           Sidebar, EngagementHeader, shared UI kit (common.jsx)
    constants/             Shared constants
    hooks/                 Cross-cutting hooks (config status, current engagement, modules, open-gaps count)
  features/
    dashboard/             Dashboard page, api, hooks, UI
    sessions/               Sessions list/detail, upload flow, api, hooks, UI
    meetings/                Live meeting bot join/status/leave, api, hooks
    knowledge/               Knowledge Base search/filter, api, hooks
    coverage/                 Coverage topics/gaps, api, hooks
    sme/                       SME contribution map, api, hooks
    chat/                       Ask Munin, conversations, citations, api, hooks, UI
    engagement/                 Engagement setup (modules, planned sessions), api, hooks, UI
    starter/                     Engagement selector (landing page before an engagement is chosen)
```

Each feature folder follows the same shape:

```text
features/<name>/
  <Name>Page.jsx       The page component — the only thing other code should import
  api.js                Thin wrapper functions around shared/api/client, scoped to this feature
  hooks/                 useX() hooks that own this feature's state, queries, and mutations
  ui/                     Feature-local presentational components (rows, modals, charts)
```

Rule of thumb: deleting a `features/<x>/` folder and its route should be the
only cleanup needed to remove that feature — no other file should reach
into its internals.

## How it's wired to the backend

- **Routing** — `react-router-dom`. `app/App.jsx` defines the route table;
  `shared/components/Sidebar.jsx` derives the active nav item from
  `useLocation()` and navigates with `useNavigate()` (no separate "page"
  state to keep in sync).
- **Server state** — `@tanstack/react-query`. Each feature's hook
  (`useSessions`, `useMeetings`, `useCoverage`, `useDashboard`, etc.) owns
  its own `useQuery`, and mutations invalidate the relevant query keys
  directly (e.g. uploading a session invalidates `dashboard` and
  `coverage` so both screens update without a manual refresh or a prop
  passed down from a parent).
- **Cross-feature navigation** — where one feature needs to jump into
  another (e.g. a Knowledge Base result linking to its source transcript
  in Sessions), it uses router state:
  `navigate("/sessions", { state: { sessionId, segTime } })`, and the
  destination reads `useLocation().state` — not a shared top-level
  variable threaded through the app shell.
- **Current engagement** — `currentEngagementId` lives in
  `shared/hooks/useCurrentEngagement.js` (persisted to `localStorage`),
  owned by `App.jsx`, and passed down to features that need it
  (`Dashboard`, `Sessions`, `Meetings`, `SME Map`, `Engagement Setup`).
  This one prop is intentional — it's genuine app-level context, not
  feature-owned data.
- **Upload flow** — `features/sessions/ui/UploadModal.jsx` calls
  `sessionsApi.uploadDocument` / `sessionsApi.uploadMedia`
  (`POST /api/documents/upload`, `POST /api/media/upload`); on success the
  new session and its knowledge objects merge into the Sessions query
  cache and `dashboard`/`coverage` are invalidated.
- **Ask Munin** — `features/chat` loads conversation history via
  `GET /api/chat/history`, sends messages via `POST /api/chat`, and
  renders the real `reply` / `citation` / `isGap` response. A logged gap
  triggers a `coverage` cache invalidation so the gap count (including the
  Sidebar badge) updates without a page reload.

## Next steps

Verification: click through every page (Dashboard, Sessions, Meetings, KB,
Coverage, SME Map, Ask Munin, Engagement Setup), including the upload flow
and a gap-logging chat question, then push.