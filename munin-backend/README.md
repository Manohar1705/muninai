# Munin Backend

Backend API for **Munin** — the AI-powered knowledge transfer assistant that attends KT sessions, captures meeting knowledge, extracts reusable insights, and builds a searchable knowledge repository for incoming engineering teams.

The backend integrates with Recall.ai for meeting participation, Groq for AI-powered extraction and Q&A, PostgreSQL for persistence, and Cloudflare Tunnel for local webhook accessibility during development.

---

## Technology Stack

- Node.js
- Express
- PostgreSQL (`pg`)
- Groq
  - Knowledge extraction
  - Ask Munin responses
  - Audio transcription
- Recall.ai
- Cloudflare Tunnel
- Optional Langfuse observability

---

## Key Features

### Multi-Engagement Support

- Create, rename, and delete engagements
- Modules, sessions, meetings, and dashboards are scoped per engagement
- Module names are namespaced per engagement, so two engagements can each define a module with the same name

### Knowledge Capture

- Live meeting transcript ingestion
- Knowledge extraction from transcripts
- Knowledge extraction from uploaded documents
- Knowledge extraction from uploaded recordings

### Ask Munin

- Knowledge-grounded answers
- Citation support
- Gap identification
- Automatic keyword-search fallback if LLM access is unavailable

### Meeting Integration

- Google Meet support
- Zoom support
- Microsoft Teams support
- Recall.ai meeting bot integration
- Real-time transcript webhook ingestion

### Developer Experience

- Automatic Cloudflare Tunnel startup
- Runtime public URL generation
- Externalized prompts
- PostgreSQL schema initialization
- Optional observability with Langfuse

---

## Setup

### Prerequisites

- Node.js 22
- npm
- Git
- Cloudflared
- A PostgreSQL database (local or hosted, such as Amazon RDS)

Verify installation:

```bash
node -v
npm -v
cloudflared --version
```

---

## Installation

```bash
cd munin-backend

npm install

npm run dev
```

For production:

```bash
npm start
```

The PostgreSQL schema is initialized during startup. The database itself must already exist.

---

## Environment Variables

Create a `.env` file inside `munin-backend`.

Example:

```env
PORT=4000

CORS_ORIGIN=http://localhost:5173

DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=munin
DB_USER=munin_app
DB_PASSWORD=your-password
PGSSL=

GROQ_API_KEY=<your-groq-api-key>
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_WHISPER_MODEL=whisper-large-v3-turbo

DEMO_SSO_TOKEN=munin-demo-sso-token

RECALL_API_KEY=<your-recall-api-key>
RECALL_API_REGION=<your-recall-project-region>

PUBLIC_BASE_URL=

LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

### Notes

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` are required. The backend constructs the PostgreSQL connection URL from them.
- Set `PGSSL=disable` only for a local PostgreSQL server without TLS. Leave it unset for RDS.
- Set `RECALL_API_REGION` to the region shown in your own Recall.ai project settings — it varies per account and isn't a fixed value.
- Leave `PUBLIC_BASE_URL` empty.
- Cloudflare Tunnel is started automatically.
- `PUBLIC_BASE_URL` is generated dynamically during application startup.
- Langfuse is optional. The application works normally without it.

---

## Prompt Management

Prompts are externalized from application code and stored under:

```text
src/prompts/
├── extractionPrompt.txt
└── systemPrompt.txt
```

### Benefits

- Easier prompt tuning
- Cleaner backend code
- Better maintainability
- Independent prompt versioning
- No application logic changes required for prompt updates

---

## Cloudflare Tunnel Automation

Munin automatically starts a Cloudflare Tunnel on backend startup.

Expected startup output:

```text
Munin backend listening on http://localhost:4000
Cloudflare Tunnel: https://xxxxx.trycloudflare.com
```

Benefits:

- No manual tunnel creation
- No manual `PUBLIC_BASE_URL` updates
- Automatic Recall.ai webhook accessibility during local development

---

## API Reference

Base URL:

```text
/api
```

All responses are returned as JSON.

---

## Health

### GET /api/health

Response:

```json
{
  "ok": true,
  "service": "munin-backend",
  "time": "2026-01-01T00:00:00Z"
}
```

---

## Authentication (Demo)

### POST /api/auth/sso

Response:

```json
{
  "token": "munin-demo-sso-token",
  "user": {}
}
```

This is a demo-only click-through authentication endpoint.

---

## Engagements

### GET /api/engagements

Returns all engagements.

---

### POST /api/engagements

Request:

```json
{
  "name": "Acme Payments Transition",
  "phase": "Discovery",
  "details": "Optional free-text context"
}
```

Creates a new engagement. New engagements start with no modules, sessions, or meetings.

---

### PATCH /api/engagements/:id

Request (any subset of fields):

```json
{
  "name": "Acme Payments Transition — Phase 2",
  "phase": "Execution",
  "details": "Updated context"
}
```

Updates an existing engagement.

---

### DELETE /api/engagements/:id

Deletes an engagement and cascades deletion to its modules, sessions, and meetings.

---

## Modules

Modules are namespaced per engagement — two engagements may each define a module with the same name independently.

### GET /api/modules

Query Parameters:

```text
engagementId=
```

Returns modules. If `engagementId` is omitted, returns modules across all engagements.

---

### POST /api/modules

Request:

```json
{
  "engagementId": 1,
  "name": "Payments Core",
  "plannedSessions": 4
}
```

Creates a module scoped to the given engagement.

---

### PATCH /api/modules/:name

Query Parameters:

```text
engagementId=
```

Request (any subset of fields):

```json
{
  "newName": "Payments Core v2",
  "plannedSessions": 6
}
```

Renames a module and/or updates its planned-session count. Planned sessions cannot be set below the module's completed-session count. Renaming cascades the new name to every session, meeting, knowledge object, gap, and readiness record that referenced the old name.

---

### DELETE /api/modules/:name

Query Parameters:

```text
engagementId=
```

Deletes a module. Fails if any session or meeting is already classified under it — reclassify them first.

---

## Dashboard

### GET /api/dashboard

Query Parameters:

```text
engagementId=
```

Returns:

- Engagement information
- Readiness metrics
- Coverage statistics
- Recent activity
- Knowledge metrics

Example:

```json
{
  "engagement": {},
  "stats": {},
  "readiness": {},
  "activity": []
}
```

---

## Sessions

### GET /api/sessions

Query Parameters:

```text
engagementId=
```

Returns a lightweight session list. If `engagementId` is omitted, returns sessions across all engagements.

---

### GET /api/sessions/:id

Returns complete session details:

- Transcript
- Knowledge objects
- Metadata
- Session information

---

### POST /api/sessions/upload

Processes uploaded KT content.

Behavior:

- Stores session data
- Extracts knowledge objects
- Updates coverage metrics
- Updates readiness metrics

---

## Knowledge Base

### GET /api/knowledge-objects

Query Parameters:

```text
module=
type=
q=
```

Returns filtered knowledge objects.

---

### GET /api/knowledge-objects/:id

Returns a single knowledge object.

---

## Coverage

### GET /api/coverage

Returns:

```json
{
  "topics": [],
  "gaps": [],
  "suggestedAgenda": {}
}
```

---

### GET /api/coverage/gaps

Returns coverage gaps only.

---

### POST /api/coverage/gaps

Request:

```json
{
  "module": "Payments",
  "question": "How are retries handled?"
}
```

Creates a new knowledge gap.

---

### PATCH /api/coverage/gaps/:id

Request:

```json
{
  "status": "Closed"
}
```

Allowed values:

- Open
- Scheduled for next session
- Closed

---

## SME Mapping

### GET /api/sme-map

Query Parameters:

```text
engagementId=
```

Returns:

```json
{
  "modules": []
}
```

Includes:

- Contributors
- Ownership distribution
- Key-person risk information

---

## Ask Munin

### GET /api/chat/history

Returns previous chat history.

---

### POST /api/chat

Request:

```json
{
  "message": "How are refunds handled?"
}
```

Example Response:

```json
{
  "reply": "...",
  "citation": "...",
  "matchedKnowledgeObjectId": "ko1",
  "isGap": false,
  "loggedGapId": null,
  "usedLlm": true
}
```

### Behavior

When `GROQ_API_KEY` is configured:

- Knowledge excerpts are shortlisted
- Context is passed to Groq
- Responses are grounded only in available KT knowledge

If Groq is unavailable:

- Automatic keyword-search fallback is used
- Existing API response format remains unchanged

If a question is not covered:

```json
{
  "reply": "This hasn't been covered in KT yet — I've logged it as a gap.",
  "citation": null,
  "isGap": true
}
```

The uncovered question is automatically recorded as a knowledge gap.

---

## Meeting Integration

Munin uses Recall.ai to participate in meetings.

Supported Platforms:

- Google Meet
- Zoom
- Microsoft Teams

Capabilities:

- Bot joins meeting
- Transcript ingestion
- Real-time webhook processing
- Knowledge extraction
- Final session processing

Meeting classification is restricted to modules already defined for that meeting's engagement, plus `Unclassified`. If an engagement has no modules defined yet, meetings and documents classify as `Unclassified` until at least one module exists.

---

## Audio Transcription

Uploaded recordings are transcribed using Groq Whisper.

Supported formats:

- mp3
- mp4
- wav
- webm
- m4a
- mpga
- mpeg

Workflow:

```text
Recording
     ↓
Groq Whisper
     ↓
Transcript
     ↓
Knowledge Extraction
```

---

## Settings

### GET /api/settings/status

Returns which integrations are currently configured (Groq, Recall.ai, webhook reachability). Used by the frontend to show configuration warnings.

---

### POST /api/settings/reset

Resets all demo data and reseeds the database.

Useful during demonstrations and testing.

---

## Database

Munin uses the PostgreSQL database configured by the five `DB_*` environment variables. Tables and demo data are initialized automatically during startup.

### Schema migrations

The existing RDS schema is captured in `drizzle/schema.ts`. For a schema change:

1. Edit `drizzle/schema.ts`.
2. Run `npm run db:generate` and review the new SQL file in `drizzle/`.
3. Run `npm run db:migrate` before starting the new application version.

In CodeBuild, run `npm run db:migrate` after `npm ci` and before deploying or starting the ECS task. CodeBuild must be able to reach RDS and must receive the same `DB_*` and `PGSSL` environment variables as the backend.

`npm run db:introspect` reads an existing database back into the Drizzle schema. It is intended for initial setup or deliberate resynchronization, not the normal deployment flow.

### Reset Demo Data

Use `POST /api/settings/reset` to clear and reseed the demo data without deleting the PostgreSQL database.

---

## Observability

Langfuse integration is optional.

When configured, Munin tracks:

- Prompt inputs
- Model outputs
- Latency metrics
- Token usage
- LLM failures

Without Langfuse configured, the application continues to function normally.

---

## Development Notes

### Automatic Cloudflare Tunnel

On startup the backend:

1. Starts Cloudflare Tunnel
2. Obtains a public URL
3. Assigns `PUBLIC_BASE_URL`
4. Enables Recall.ai webhook delivery

No manual configuration is required.

---

### Externalized Prompts

Prompt templates are maintained separately under:

```text
src/prompts/
```

This allows prompt modifications without changing backend implementation logic.

---

## Troubleshooting

### Cloudflare Tunnel Not Starting

Verify:

```bash
cloudflared --version
```

Expected startup output:

```text
Cloudflare Tunnel: https://xxxxx.trycloudflare.com
```

---

### Bot Joins But No Transcript Appears

Verify backend logs contain:

```text
WEBHOOK RECEIVED
```

and:

```text
Cloudflare Tunnel:
```

If webhook events are arriving, transcript delivery is working.

---

### Backend Not Reachable

Verify backend:

```text
http://localhost:4000
```

Verify frontend:

```text
http://localhost:5173
```

Verify backend startup logs contain:

```text
Cloudflare Tunnel:
```

---

## Current Limitations

- Authentication is demo-only; the SSO route is a click-through token exchange, not real identity.
- Authorization, tenant isolation, and role-based access control are not implemented.
- Recall webhook signature verification is not implemented.
- CORS defaults to `*` when `CORS_ORIGIN` is unset.
- Cloudflare automatic tunnel startup invokes `cmd.exe` and is Windows-specific.
- No automated backend tests yet.

---

## Future Enhancements

- Production-grade authentication
- Multi-tenant architecture (beyond current multi-engagement scoping)
- Automated backend tests
- Cloud deployment automation
