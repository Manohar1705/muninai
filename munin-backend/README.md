# Munin Backend

Backend API for **Munin** — the AI-powered knowledge transfer assistant that attends KT sessions, captures meeting knowledge, extracts reusable insights, and builds a searchable knowledge repository for incoming engineering teams.

The backend integrates with Recall.ai for meeting participation, Groq for AI-powered extraction and Q&A, SQLite for persistence, and Cloudflare Tunnel for local webhook accessibility during development.

---

## Technology Stack

- Node.js
- Express
- SQLite (`better-sqlite3`)
- Groq
  - Knowledge extraction
  - Ask Munin responses
  - Audio transcription
- Recall.ai
- Cloudflare Tunnel
- Optional Langfuse observability

---

## Key Features

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
- SQLite auto-initialization
- Optional observability with Langfuse

---

## Setup

### Prerequisites

- Node.js 18+
- npm
- Git
- Cloudflared

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

The SQLite database is created automatically during startup.

---

## Environment Variables

Create a `.env` file inside `munin-backend`.

Example:

```env
PORT=4000

CORS_ORIGIN=http://localhost:5173

DB_PATH=./munin.db

GROQ_API_KEY=<your-groq-api-key>
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_WHISPER_MODEL=whisper-large-v3-turbo

DEMO_SSO_TOKEN=munin-demo-sso-token

RECALL_API_KEY=<your-recall-api-key>
RECALL_API_REGION=ap-northeast-1

PUBLIC_BASE_URL=

LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

### Notes

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

## Dashboard

### GET /api/dashboard

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

Returns a lightweight session list.

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

### POST /api/settings/reset

Resets all demo data and reseeds the database.

Useful during demonstrations and testing.

---

## Database

SQLite database location:

```text
munin.db
```

Automatically created and seeded during startup.

### Reset Database

Windows:

```bash
del munin.db
```

Linux/macOS:

```bash
rm munin.db
```

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

## Future Enhancements

Potential future improvements:

- Jira integration
- ServiceNow integration
- Slack notifications
- Microsoft Teams notifications
- Production-grade authentication
- Multi-engagement support
- Multi-tenant architecture
- Knowledge quality scoring
- Automated meeting summaries
- Advanced analytics dashboards
- Cloud deployment automation