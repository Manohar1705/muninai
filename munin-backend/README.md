# Munin Backend

Backend API for **Munin** — the AI agent that attends KT (knowledge-transfer)
sessions, builds a knowledge repository, and removes human dependency from
application transitions. Built to sit behind the existing Munin React
frontend for the "Nova Payments Platform" demo engagement.

## Stack

- Node.js + Express
- SQLite (via `better-sqlite3`) — single file DB, seeded on first run
- No auth (fake click-through SSO endpoint for enterprise feel)
- Optional Anthropic API integration for LLM-grounded chat answers, with an
  automatic keyword-matching fallback when no API key is configured

## Setup

```bash
cd munin-backend
npm install
cp .env.example .env   # edit if you want to set ANTHROPIC_API_KEY, PORT, etc.
npm run seed           # optional — first server start also seeds automatically
npm start               # http://localhost:4000
```

Use `npm run dev` (nodemon) while iterating.

The SQLite file (`munin.db` by default, path configurable via `DB_PATH`) is
created and seeded automatically the first time the server starts. It's
gitignored — don't commit it.

## Environment variables

| Var | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `4000` |
| `CORS_ORIGIN` | Allowed origin for the frontend | `*` |
| `DB_PATH` | SQLite file path | `./munin.db` |
| `ANTHROPIC_API_KEY` | If set, Ask Munin uses real LLM-grounded answers | unset (keyword fallback) |
| `ANTHROPIC_MODEL` | Model string for chat | `claude-sonnet-4-6` |
| `DEMO_SSO_TOKEN` | Token returned by the fake SSO login | `munin-demo-sso-token` |

## API reference

All responses are JSON. Base path: `/api`.

### Health
- `GET /api/health` → `{ ok, service, time }`

### Auth (fake SSO, demo only)
- `POST /api/auth/sso` → `{ token, user }`

### Dashboard
- `GET /api/dashboard` →
  ```json
  {
    "engagement": { "name": "...", "phase": "Reverse Shadow" },
    "stats": {
      "sessionsProcessed": 8, "transcriptSegments": 71,
      "knowledgeObjects": 32, "needsReview": 6,
      "openGaps": 11, "totalGaps": 12, "overallReadiness": 67
    },
    "readiness": { "Payments Core": 88, "...": "..." },
    "activity": [{ "text": "...", "createdAt": "..." }]
  }
  ```

### Sessions
- `GET /api/sessions` → lightweight list (no transcript)
- `GET /api/sessions/:id` → full session incl. `transcript` and `knowledgeObjects` extracted from it
- `POST /api/sessions/upload` → **simulated processing flow.** The frontend
  should run its own animated "Transcribing → Extracting → Indexing" UI for
  ~6 seconds and call this endpoint once (typically right when the animation
  finishes, or in parallel with it). It idempotently adds the pre-defined
  Session 9 ("Notification Gateway Failover & DR"), its 4 knowledge objects,
  bumps `Customer Notifications` coverage/readiness, and closes gap `g9`.
  Calling it again returns `{ alreadyUploaded: true }` and does nothing.

### Knowledge base
- `GET /api/knowledge-objects?module=&type=&q=` → filtered list
- `GET /api/knowledge-objects/:id` → single object detail

### Coverage
- `GET /api/coverage` → `{ topics, gaps, suggestedAgenda: { uncoveredTopics, topOpenGaps } }`
- `GET /api/coverage/gaps` → gaps list only
- `POST /api/coverage/gaps` `{ module, question, status? }` → create a gap
- `PATCH /api/coverage/gaps/:id` `{ status }` → update status (`Open` | `Scheduled for next session` | `Closed`)

### SME map
- `GET /api/sme-map` → `{ modules: [{ module, contributors: [{name, share}], keyPersonRisk }] }`

### Ask Munin (chat)
- `GET /api/chat/history` → prior messages (seeded with one example Q&A)
- `POST /api/chat` `{ message }` →
  ```json
  {
    "reply": "...",
    "citation": "KT Session 2 — ..., 00:04:09",
    "matchedKnowledgeObjectId": "ko1",
    "isGap": false,
    "loggedGapId": null,
    "usedLlm": false
  }
  ```
  If the question isn't covered by the knowledge base, `reply` is exactly
  *"This hasn't been covered in KT yet — I've logged it as a gap."*, `citation`
  is `null`, `isGap` is `true`, and a new row is inserted into `gaps` — visible
  immediately from `GET /api/coverage`.

  Behavior is automatic: if `ANTHROPIC_API_KEY` is set, the question is
  answered by Claude using **only** a shortlist of relevant knowledge-base
  excerpts as context (strict system prompt, JSON-constrained output). If the
  key is absent, or the LLM call fails for any reason, it falls back to
  token-overlap keyword matching over the knowledge base — same
  cited-answer / gap-logging contract either way, so the frontend never needs
  to know which path served the answer.

### Settings
- `POST /api/settings/reset` → wipes and re-seeds all tables back to the
  initial demo state (including re-closing the Session 9 upload flag), so the
  full demo — including the upload "wow moment" — is repeatable.

## Wiring to the existing frontend

The frontend currently holds all seed data in local React state
(`SESSIONS_SEED`, `KNOWLEDGE_OBJECTS_SEED`, etc.) and simulates the upload
and chat behavior client-side. To connect it to this backend:

1. Replace the hardcoded `SESSIONS_SEED` / `KNOWLEDGE_OBJECTS_SEED` / etc.
   constants with `fetch` calls to the corresponding endpoints above on mount.
2. In `Sessions`, keep the local `UploadFlow` animation as-is for the visual
   "wow moment", but call `POST /api/sessions/upload` when it starts (or when
   it completes) instead of mutating local state directly — then merge the
   returned `session`, `newKnowledgeObjects`, `updatedReadiness`, and
   `closedGapId` into state.
3. In `AskMunin`, replace `answerFromKB(...)` with `POST /api/chat` and render
   `reply` / `citation` / `isGap` from the response.
4. Add a "Reset demo data" item to the settings menu that calls
   `POST /api/settings/reset` and then re-fetches everything.

## Not included (by design, per spec)

No real audio transcription, no real meeting bots, no Jira/ServiceNow
connectors, no multi-user auth, no multi-engagement support. This is a
single-engagement demo backend with rich seeded data plus one simulated
upload flow, matching the frontend it's built for.
