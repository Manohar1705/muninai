# Munin

Munin is an AI-assisted knowledge-transfer platform for transition and handover engagements. It captures knowledge from live meetings, documents, and recordings; turns that material into structured knowledge objects; and gives incoming teams a searchable record of what was covered, who contributed it, and where gaps remain.

The current application is a multi-engagement demo/MVP built around a simple principle:

> A transition should be measured by the knowledge the incoming team has actually received, not only by the meetings that were scheduled.

## What Munin Does

Munin supports the complete knowledge-transfer workflow:

1. Create or select an engagement.
2. Define the engagement's modules and the number of KT sessions planned for each module.
3. Capture knowledge from:
   - live Google Meet, Zoom, or Microsoft Teams calls;
   - uploaded text, Markdown, PDF, or DOCX documents;
   - uploaded audio or video recordings.
4. Use Groq to extract reusable knowledge objects such as procedures, architecture decisions, configurations, ownership details, and gotchas.
5. Store sessions, transcripts, extracted knowledge, gaps, meeting state, and chat history in PostgreSQL.
6. Review readiness, coverage, SME contribution, and key-person risk.
7. Ask Munin questions and follow citations back to the supporting session or transcript.

## Current User Flow

### 1. Select or create an engagement

The first screen is the engagement workspace selector. An engagement contains:

- a name;
- a transition phase;
- optional details;
- its own module definitions;
- planned-session counts;
- sessions and meetings captured for that engagement.

The selected engagement is remembered in browser storage so that refreshing the page returns to the same workspace.

### 2. Configure modules and the KT plan

Open **Engagement Setup** to add, rename, or remove modules and set the planned number of KT sessions for each one.

Modules are scoped to an engagement, so two engagements may use the same module name independently. A module cannot be deleted after sessions or meetings have been classified under it, and its planned-session count cannot be reduced below its completed-session count.

### 3. Capture knowledge

Munin provides three capture paths.

#### Live meeting

1. Open **Meetings** and enter the meeting URL, title, and bot name.
2. The backend asks Recall.ai to send a bot to the call.
3. Recall.ai sends live transcript and participant events to Munin's public webhook.
4. Munin buffers transcript chunks in PostgreSQL.
5. The frontend polls the meeting status.
6. While the call is active, Munin performs throttled incremental extraction so knowledge can appear before the meeting ends.
7. When the meeting ends—or Munin is removed manually—a final extraction pass processes the remaining transcript and marks the derived session complete.

Meeting classification is restricted to modules defined for that engagement, plus `Unclassified`. Changing a meeting's module also updates its derived session and knowledge objects.

#### Document upload

From **Sessions → Upload session**, upload one of:

- `.txt`
- `.md`
- `.pdf`
- `.docx`

Munin extracts the text in memory, sends it to Groq, and stores the document as a completed session with its extracted knowledge objects.

#### Recording upload

The same upload screen accepts:

- `.mp4`
- `.mp3`
- `.mpeg`
- `.mpga`
- `.m4a`
- `.wav`
- `.webm`

Groq Whisper transcribes the file first. The transcript then passes through the same knowledge-extraction pipeline used for documents and live meetings.

Document and recording uploads are limited to 25 MB. Uploaded files are processed in memory and are not retained as files by the backend.

### 4. Review and use the captured knowledge

- **Dashboard** shows modules covered, planned and completed KT sessions, overall readiness, per-module progress, and recent activity.
- **Sessions** provides the engagement's session list, transcripts, attendees, and extracted knowledge objects.
- **Meetings** shows active and historical meeting-bot runs, status, participants, classification, and links to generated sessions.
- **Knowledge Base** supports text, module, and knowledge-type filtering and links results back to their source sessions.
- **Coverage** shows topic depth, tracked gaps, and a suggested next-session agenda.
- **SME Map** estimates talk-time share and attributable knowledge contribution by speaker and flags concentrated key-person risk.
- **Ask Munin** provides persistent conversations with rename, pin, archive, and delete controls.

## Readiness Model

Readiness is currently a transparent coverage ratio rather than an LLM-generated maturity score:

```text
module readiness = completed KT sessions / planned KT sessions
overall readiness = all completed KT sessions / all planned KT sessions
```

Values are capped at 100%.

Only sessions whose source is a KT session or live meeting count toward planned-session completion. Documents and recordings enrich the knowledge base but do not currently count as completed planned KT sessions. This avoids treating supporting material as a replacement for an explicitly planned KT session.

## Ask Munin

Ask Munin uses a layered answering flow:

1. Recognizable database questions—such as session counts, meeting counts, gaps, modules, or readiness—are answered directly from PostgreSQL.
2. When Groq is configured, Munin sends a shortlist of relevant knowledge objects and transcript excerpts, recent conversation turns, and live database context to the configured model.
3. The model distinguishes ordinary conversation from engagement-specific KT questions.
4. KT answers can include a citation with a session ID and transcript timestamp.
5. If Groq is unavailable, Munin falls back to keyword-overlap matching over the stored knowledge and transcripts.
6. In fallback mode, an unmatched KT question is logged as an open coverage gap.

Chat history is stored as separate conversations. Conversations can be renamed, pinned, archived, and deleted.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       Knowledge sources                     │
│  Google Meet / Zoom / Teams   Documents   Audio / video     │
└───────────────┬────────────────────┬──────────────┬─────────┘
                │                    │              │
          Recall.ai bot       Text extraction  Groq Whisper
                │                    │              │
                └──────────────┬─────┴──────────────┘
                               ▼
                    Express capture pipeline
                               │
                               ▼
                      Groq knowledge extraction
                               │
                               ▼
        PostgreSQL sessions, transcripts, knowledge, and gaps
                               │
                               ▼
            React dashboard, repository, SME map, and chat
```

### Repository structure

```text
muninai/
├── .github/
│   └── workflows/
│       └── keep-alive.yml
├── munin-backend/
│   ├── src/
│   │   ├── data/             Demo seed data
│   │   ├── middleware/       Express error handling
│   │   ├── prompts/          LLM extraction and chat prompts
│   │   ├── routes/           REST API route modules
│   │   ├── services/         LLM, meeting, readiness, and module logic
│   │   ├── db.js             PostgreSQL schema, pooling, and seeding
│   │   └── server.js         Express application entry point
│   └── package.json
├── munin-frontend/
│   ├── src/
│   │   ├── app/              Routing and application composition
│   │   ├── features/         Feature pages, hooks, APIs, and UI
│   │   └── shared/           API client, components, constants, and hooks
│   └── package.json
├── README.md
└── start.cmd                 Windows local-development launcher
```

## Technology Stack

### Frontend

- React 18
- Vite 5
- React Router
- TanStack Query
- Recharts
- Framer Motion

### Backend

- Node.js 22
- Express
- PostgreSQL via `pg`
- Multer
- `pdf-parse`
- Mammoth

### Integrations

- Groq chat completions for question answering and knowledge extraction
- Groq Whisper for uploaded recording transcription
- Recall.ai for meeting bots and realtime transcripts
- Langfuse for optional LLM observability
- Cloudflare Quick Tunnels for local webhook access

## Prerequisites

- Node.js 22
- npm
- A PostgreSQL database (local or hosted, such as Amazon RDS)
- A Groq API key for AI extraction, generative chat, and recording transcription
- A Recall.ai API key for live meeting capture
- `cloudflared` on `PATH` when using automatic local webhook tunnelling

Verify the local tools:

```bash
node --version
npm --version
cloudflared --version
```

## Configuration

Copy the example environment files:

### Backend

Create `munin-backend/.env` from `munin-backend/.env.example`:

```env
PORT=4000
CORS_ORIGIN=http://localhost:5173
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=munin
DB_USER=munin_app
DB_PASSWORD=your-password
PGSSL=

GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_WHISPER_MODEL=whisper-large-v3-turbo

DEMO_SSO_TOKEN=munin-demo-sso-token

RECALL_API_KEY=
RECALL_API_REGION=us-west-2
PUBLIC_BASE_URL=

LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

Configuration behavior:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` are required. The backend safely constructs the PostgreSQL connection URL from them.
- Set `PGSSL=disable` only for local PostgreSQL servers that do not use TLS; leave it unset for RDS.
- Without `GROQ_API_KEY`, generative chat and all extraction/transcription flows are disabled; Ask Munin retains its keyword fallback.
- Without `RECALL_API_KEY`, Munin cannot join live meetings.
- Recall.ai must be able to reach `PUBLIC_BASE_URL/api/meetings/webhook` to deliver transcripts.
- On the current Windows local-development path, the backend starts a Cloudflare Quick Tunnel and fills `PUBLIC_BASE_URL` at runtime.
- Langfuse is optional and does not affect the underlying Groq request when it is not configured.

Do not commit real `.env` files or API keys.

### Frontend

The frontend defaults to:

```text
http://localhost:4000/api
```

To use a different backend, create `munin-frontend/.env`:

```env
VITE_API_BASE=https://your-backend.example.com/api
```

## Run Locally

Both applications must run at the same time.

### Option A: separate terminals

Terminal 1:

```bash
cd munin-backend
npm install
npm run dev
```

Terminal 2:

```bash
cd munin-frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The backend health endpoint is:

```text
http://localhost:4000/api/health
```

### Option B: Windows launcher

From the repository root:

```bat
start.cmd
```

The launcher opens separate backend and frontend terminals and then installs/starts both applications.

## API Overview

All routes are mounted below `/api`.

| Area | Main endpoints |
|---|---|
| Health | `GET /health` |
| Runtime events | `GET /events` |
| Engagements | `GET/POST /engagements`, `PATCH/DELETE /engagements/:id` |
| Modules | `GET/POST /modules`, `PATCH/DELETE /modules/:name` |
| Dashboard | `GET /dashboard?engagementId=:id` |
| Sessions | `GET /sessions`, `GET /sessions/:id`, `PATCH /sessions/:id/module` |
| Documents | `POST /documents/upload` |
| Recordings | `POST /media/upload` |
| Meetings | `GET /meetings`, `POST /meetings/join`, `GET /meetings/:id/status`, `POST /meetings/:id/leave` |
| Recall webhook | `POST /meetings/webhook` |
| Knowledge | `GET /knowledge-objects`, `GET /knowledge-objects/:id` |
| Coverage | `GET /coverage`, `GET/POST /coverage/gaps`, `PATCH /coverage/gaps/:id` |
| SME map | `GET /sme-map?engagementId=:id` |
| Chat | `GET /chat/conversations`, `GET /chat/history`, `POST /chat` |
| Configuration | `GET /settings/status` |
| Demo reset | `POST /settings/reset` |
| Demo SSO | `POST /auth/sso` |

## Database

Munin constructs its PostgreSQL connection from the five `DB_*` environment variables and creates its tables and demo seed data automatically on startup. The database itself must already exist.

The schema includes:

- engagements and engagement-owned modules;
- sessions and transcript segments;
- extracted knowledge objects;
- meetings and raw realtime transcript chunks;
- coverage topics and gaps;
- SMEs, contribution data, and key-person-risk markers;
- readiness and activity;
- chat conversations and messages;
- application state used by the repeatable demo flow.

Startup seeding is transactionally serialized so rolling deployments can safely start multiple backend instances against the same database.

To initialize or seed explicitly:

```bash
cd munin-backend
npm run seed
```

## Observability

When both Langfuse keys are set, each Groq operation is traced:

- `ask-munin`
- `extract-knowledge`
- `transcribe-audio`

Tracing records bounded prompt/output data, model metadata, latency, and errors. Langfuse failures are intentionally non-blocking and do not fail the user request.

## Graceful Degradation

The UI checks backend configuration and warns when important integrations are unavailable.

| Missing configuration | Result |
|---|---|
| Groq | No document/meeting extraction or recording transcription; chat uses keyword fallback |
| Recall.ai | Live meeting join is unavailable |
| Public webhook URL | A bot may join, but realtime transcripts cannot reach Munin |
| Langfuse | AI functionality continues without tracing |
| Cloudflare tunnel | The rest of the backend remains available; a reachable webhook URL must be supplied separately |

## Current Scope and Limitations

Munin is currently a demo/MVP. Before production use, the following areas need additional work:

- Authentication is not enforced by the frontend or API; the current SSO route is only a demo token exchange.
- Authorization, tenant isolation, and role-based access control are not implemented.
- Multi-engagement scoping is complete for the main engagement, module, session, meeting, dashboard, and SME flows, but the knowledge repository, coverage data, activity feed, and Ask Munin context still contain global paths that should be scoped before multi-tenant use.
- Recall webhook signature verification is not implemented.
- CORS defaults to `*` when `CORS_ORIGIN` is absent.
- Cloudflare automatic tunnel startup currently invokes `cmd.exe` and is therefore Windows-specific.
- Uploaded source files are not retained; only extracted text/transcripts and knowledge objects are stored.
- Uploaded recordings do not provide reliable speaker diarization and are stored as a single `Recording` transcript segment.
- There is no retry queue for failed writes or external AI calls.
- Some frontend mutation failures still use browser `alert()` messages.
- Automated unit, integration, and end-to-end tests have not yet been added.

## Recommended Production Hardening

Before deploying Munin for real transition data:

1. Add real identity, authorization, and engagement-level access controls.
2. Finish engagement scoping across knowledge, coverage, activity, readiness storage, and chat.
3. Validate Recall webhook signatures and rate-limit public endpoints.
4. Move from automatic Quick Tunnels to a stable HTTPS deployment URL.
5. Add request validation, structured logging, and centralized error classification.
6. Add background jobs for transcription and extraction instead of holding upload requests open.
7. Add database backups and a production migration strategy.
8. Add automated backend, frontend, and end-to-end tests.
9. Add frontend route-level code splitting and deployment observability.

## Verification Checklist

After configuration and startup:

1. Open the engagement selector and create or select an engagement.
2. Add modules and planned-session counts under Engagement Setup.
3. Confirm the Dashboard displays the plan as `completed / planned`.
4. Upload a supported document and verify its session, transcript text, and knowledge objects.
5. Upload a short recording and verify transcription and extraction.
6. Send Munin into a test meeting and confirm participant/transcript webhook events arrive.
7. Let status polling create an in-progress session, then end the meeting and confirm the session becomes complete.
8. Reclassify a session or meeting and confirm related knowledge follows it.
9. Search the Knowledge Base and open a source session.
10. Ask a KT-specific question, verify the answer, and follow its citation.
11. Review Coverage and SME Map results.

## Project Status

The current codebase successfully builds as a Vite production frontend, and all backend JavaScript files pass Node syntax checks. It should be treated as a functional demo and foundation for further hardening—not yet as a production-secure, multi-tenant knowledge system.
