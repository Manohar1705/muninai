# Munin

The AI agent that attends KT (knowledge-transfer) sessions, builds a
knowledge repository, and removes human dependency from application
transitions. Demo built for the "Nova Payments Platform" transition
engagement.

This repo has two parts:

```
munin/
├── munin-frontend/   React UI (Vite)
└── munin-backend/    Node/Express API + SQLite
```

The frontend has no data of its own — it fetches everything from the
backend over HTTP. **Both must be running at the same time** for the app
to work. See each folder's own README for full details on that part;
this file is just the quickstart for running the whole thing.

## Prerequisites

- **Node.js** v18+ (includes npm) — https://nodejs.org, download the LTS
  version. Verify with:
  ```bash
  node -v
  npm -v
  ```
- **Git** — https://git-scm.com

## Run it

Open two terminals.

**Terminal 1 — backend** (`http://localhost:4000`):
```bash
cd munin-backend
npm install
cp .env.example .env
npm start
```

**Terminal 2 — frontend** (`http://localhost:5173`):
```bash
cd munin-frontend
npm install
npm run dev
```

Open the URL the frontend prints in your browser. The backend must be
reachable for the app to load data — if you see a "Couldn't reach the
Munin backend" screen, make sure Terminal 1 is still running.

*(Windows: use `copy .env.example .env` instead of `cp`.)*

## What to check it works

- All six pages load real data: Dashboard, Sessions, Knowledge base,
  Coverage, SME map, Ask Munin.
- Click a session → transcript + extracted knowledge objects load.
- Sessions → "Upload session recording" → animation runs → Session 9 appears.
- Ask Munin → ask something covered (get an answer + citation) and
  something unrelated (gets logged as a gap under Coverage).
- Sidebar → "Reset demo data" → everything returns to the seeded state.

## Stack

- **Frontend:** React + Vite, Recharts for charts, no external state
  library (plain `useState`/`useEffect`).
- **Backend:** Node.js + Express, SQLite via `better-sqlite3` (single file
  DB, auto-seeded on first run), optional Anthropic API integration for
  LLM-grounded chat answers with an automatic keyword-matching fallback.

## Cloning this on another machine

```bash
git clone <this-repo-url>
cd munin
```

Then repeat the "Run it" steps above in both folders — `node_modules/`,
`.env`, and the SQLite `.db` file are gitignored, so they aren't in the
repo; `npm install` and `cp .env.example .env` recreate them locally.

## Not included (by design, demo scope)

No real audio transcription, no real meeting bots, no Jira/ServiceNow
connectors, no multi-user auth, no multi-engagement support.
