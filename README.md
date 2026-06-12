# VOXA

Turn anything you read into something you can listen to.

VOXA is a SaaS product prototype with a Next.js frontend and FastAPI backend. It supports PDF extraction, text-to-audio generation, history, voices, a polished audio-library experience, and persistent light and dark themes.

## Stack

- Next.js, TypeScript, Tailwind CSS
- shadcn-style UI primitives
- Framer Motion
- Lucide icons
- FastAPI
- PyMuPDF
- edge-tts
- SQLite

## Setup

Install frontend dependencies:

```bash
cd apps/web
bun install
```

Install backend dependencies:

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

From the project root, start the API:

```bash
.\apps\api\.venv\Scripts\Activate.ps1
bun run dev:api
```

In a second terminal, start the web app:

```bash
bun run dev:web
```

Open [http://localhost:3000](http://localhost:3000).

## API

- `POST /extract-pdf`
- `GET /voices`
- `POST /generate-audio`
- `GET /history`
- `DELETE /history/{id}`

Generated audio and uploaded PDFs are stored under `apps/api/storage`. SQLite data is stored in `apps/api/voxa.db`.
