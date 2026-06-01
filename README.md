# VOXA

Turn anything you read into something you can listen to.

VOXA is a dark-first SaaS product prototype with a Next.js frontend and FastAPI backend. It supports PDF extraction, text-to-audio generation, history, voices, and a polished audio-library experience.

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

Start the API:

```bash
cd apps/api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Start the web app:

```bash
cd apps/web
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

- `POST /extract-pdf`
- `GET /voices`
- `POST /generate-audio`
- `GET /history`
- `DELETE /history/{id}`

Generated audio and uploaded PDFs are stored under `apps/api/storage`. SQLite data is stored in `apps/api/voxa.db`.
