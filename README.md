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

---

## Prerequisites

- Node.js 18+
- npm
- Git
- Cloudflare Tunnel

Verify installation:

```bash
node -v
npm -v
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

PUBLIC_BASE_URL=<cloudflare-url>

LANGFUSE_SECRET_KEY=<optional>
LANGFUSE_PUBLIC_KEY=<optional>
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

---

## Running Munin

### Step 1 — Start Cloudflare Tunnel

Open Terminal 1:

```bash
cd munin-backend

cloudflared tunnel --url http://localhost:4000
```

Cloudflare will generate a URL similar to:

```text
https://example.trycloudflare.com
```

Update:

```env
PUBLIC_BASE_URL=https://example.trycloudflare.com
```

---

### Step 2 — Start Backend

Open Terminal 2:

```bash
cd munin-backend

npm install

npm run dev
```

Expected output:

```text
Munin backend listening on http://localhost:4000
```

---

### Step 3 — Start Frontend

Open Terminal 3:

```bash
cd munin-frontend

npm install

npm run dev
```

Expected URL:

```text
http://localhost:5173
```

Open the frontend URL in your browser.

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
- Saves information into SQLite

---

### After The Meeting

Munin automatically:

- Performs a final extraction pass
- Generates knowledge objects
- Updates the Knowledge Base
- Updates Coverage metrics
- Updates SME mapping

---

## Verify It Works

### Dashboard

- Loads successfully
- Displays metrics and charts

### Sessions

- Meeting appears in history
- Transcript loads
- Extracted knowledge objects are visible

### Knowledge Base

- Newly extracted knowledge is searchable

### Ask Munin

Try:

```text
What was discussed in the latest KT session?
```

Expected result:

- LLM-generated response
- Knowledge citations

### Coverage

Ask an unrelated question.

Expected:

- Gap is logged under Coverage.

---

## Database

Munin uses SQLite:

```text
munin-backend/munin.db
```

The database is automatically generated.

To reset locally:

```bash
del munin.db
```

Windows

```bash
rm munin.db
```

Linux/macOS

---

## Troubleshooting

### Bot Joins But No Transcript Appears

Verify:

```env
PUBLIC_BASE_URL
```

matches the current Cloudflare URL.

Restart backend:

```bash
npm run dev
```

Check backend logs for:

```text
WEBHOOK RECEIVED: transcript.data
```

If present, transcript delivery is working.

---

### Cloudflare URL Changed

Start a new tunnel:

```bash
cloudflared tunnel --url http://localhost:4000
```

Copy the new URL:

```text
https://xxxxx.trycloudflare.com
```

Update:

```env
PUBLIC_BASE_URL=https://xxxxx.trycloudflare.com
```

Restart backend.

---

### Backend Not Reachable

Verify backend:

```bash
http://localhost:4000
```

Verify frontend:

```bash
http://localhost:5173
```

Verify Cloudflare tunnel is active.

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

- Langfuse

### Public Tunneling

- Cloudflare Tunnel

---

## Demo Scope

### Included

- AI-powered knowledge capture
- Recall.ai meeting bot
- Live transcript ingestion
- Groq-based knowledge extraction
- Knowledge repository
- Ask Munin conversational search
- Coverage tracking
- SME mapping
- Meeting recording uploads

### Not Included

- Production authentication
- Jira integration
- ServiceNow integration
- Multi-tenant support
- Enterprise deployment automation
