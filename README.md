# Munin

Munin is an AI-powered knowledge transfer assistant that joins KT sessions, captures meeting conversations, extracts knowledge using LLMs, and builds a searchable knowledge repository.

Built for the Nova Payments Platform transition engagement, Munin reduces dependency on SMEs by automatically documenting knowledge shared during meetings.

---

## Architecture

```text
Google Meet / Zoom / Teams
            │
            ▼
        Recall.ai Bot
            │
            ▼
     Meeting Transcript
            │
            ▼
       Munin Backend
            │
            ▼
        Groq LLM
            │
            ▼
 Knowledge Objects / Insights
            │
            ▼
      Munin Frontend
```

---

## Repository Structure

```text
munin/
├── munin-frontend/   React + Vite frontend
└── munin-backend/    Node.js + Express API + SQLite
```

Both applications must be running simultaneously.

---

## Features

### Knowledge Capture

- Automatically joins meetings via Recall.ai
- Captures live meeting transcripts
- Extracts knowledge objects in real time
- Performs final extraction after meeting completion

### Knowledge Repository

- Searchable knowledge base
- Session history
- SME mapping
- Coverage tracking
- Knowledge gap identification

### Ask Munin

- Ask questions about captured knowledge
- Groq-powered LLM responses
- Source citations
- Fallback keyword search if LLM is unavailable

### Meeting Recordings

- Upload meeting recordings
- Speech-to-text transcription
- Automatic knowledge extraction

### Cloudflare Tunnel Automation

- Automatically starts a Cloudflare Tunnel when the backend starts
- Automatically generates a public URL
- Automatically configures runtime webhook access
- Eliminates manual tunnel creation and URL copy-paste

---

## Prompt Management

LLM prompts are externalized and stored separately from application code.

```text
munin-backend/
└── src/
    └── prompts/
        ├── extractionPrompt.txt
        └── systemPrompt.txt
```

Benefits:

- Easier prompt updates
- Cleaner codebase
- Better maintainability
- Prompt versioning through Git
- No code changes required for prompt tuning

---

## Prerequisites

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

## Environment Setup

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

# Optional - Langfuse Observability
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

### Note

- Leave `PUBLIC_BASE_URL` empty.
- The backend automatically starts a Cloudflare Tunnel and sets the URL dynamically at runtime.
- Langfuse is optional. Leave the Langfuse variables empty if you do not need tracing and observability.

---

## Running Munin

### Step 1 — Start Backend

Open Terminal 1:

```bash
cd munin-backend

npm install

npm run dev
```

Expected output:

```text
Munin backend listening on http://localhost:4000
Cloudflare Tunnel: https://xxxxx.trycloudflare.com
```

The Cloudflare Tunnel URL is generated automatically and used for webhook communication.

---

### Step 2 — Start Frontend

Open Terminal 2:

```bash
cd munin-frontend

npm install

npm run dev
```

Expected output:

```text
http://localhost:5173
```

Open the URL in your browser.

---

## Meeting Workflow

### Send Munin To A Meeting

1. Open Munin.
2. Navigate to Sessions.
3. Click **Send Munin To Meeting**.
4. Enter a Google Meet, Zoom, or Microsoft Teams link.
5. Munin joins the meeting through Recall.ai.

---

### During The Meeting

Munin:

- Captures live meeting captions/transcripts
- Receives webhook events from Recall.ai
- Sends transcript chunks to Groq
- Extracts knowledge objects and insights
- Stores extracted knowledge in SQLite

---

### After The Meeting

Munin automatically:

- Performs a final extraction pass
- Generates knowledge objects
- Updates the Knowledge Base
- Updates Coverage metrics
- Updates SME ownership mapping

---

## Verify It Works

### Backend

Expected output:

```text
Munin backend listening on http://localhost:4000
Cloudflare Tunnel: https://xxxxx.trycloudflare.com
```

### Dashboard

- Loads successfully
- Metrics are visible
- Charts render correctly

### Sessions

- Meeting appears in history
- Transcript loads
- Extracted knowledge objects are displayed

### Knowledge Base

- Newly extracted knowledge is searchable

### Ask Munin

Example:

```text
What was discussed in the latest KT session?
```

Expected result:

- LLM-generated response
- Source citation
- Knowledge-based answer

### Coverage

Ask an unrelated question.

Expected result:

```text
This hasn't been covered in KT yet — I've logged it as a gap.
```

---

## Database

Munin uses SQLite.

Database file:

```text
munin-backend/munin.db
```

The database is automatically created on startup.

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

## Troubleshooting

### Bot Joins But No Transcript Appears

Verify backend logs contain:

```text
WEBHOOK RECEIVED
```

and

```text
Cloudflare Tunnel: https://xxxxx.trycloudflare.com
```

If webhook events are arriving, transcript delivery is working.

---

### Cloudflare Tunnel Issues

Restart the backend:

```bash
npm run dev
```

A fresh Cloudflare Tunnel URL will be created automatically.

Expected output:

```text
Cloudflare Tunnel: https://xxxxx.trycloudflare.com
```

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

### Cloudflared Not Found

Ensure Cloudflared is installed and available in PATH:

```bash
cloudflared --version
```

If the command fails, install Cloudflared and restart the terminal.

---

## Technology Stack

### Frontend

- React
- Vite
- Recharts

### Backend

- Node.js
- Express
- SQLite
- better-sqlite3

### AI

- Groq
- Llama 3.3 70B Versatile
- Whisper Large v3 Turbo

### Meeting Integration

- Recall.ai

### Observability

- Langfuse (Optional)

### Public Tunneling

- Cloudflare Tunnel

---

## Demo Scope

### Included

- AI-powered knowledge capture
- Recall.ai meeting bot integration
- Live transcript ingestion
- Groq-based knowledge extraction
- Knowledge repository
- Ask Munin conversational search
- Coverage tracking
- SME mapping
- Meeting recording uploads
- Automatic Cloudflare Tunnel creation
- Externalized LLM prompts

### Future Enhancements

- Production authentication
- Jira integration
- ServiceNow integration
- Multi-tenant support
- Enterprise deployment automation