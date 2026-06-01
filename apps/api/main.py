from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from database import get_connection, init_db, rows_to_dicts
from services.pdf_service import save_and_extract_pdf
from services.storage_service import AUDIO_DIR, ensure_storage
from services.tts_service import curated_voices, generate_audio_file


class GenerateAudioRequest(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    text: str = Field(min_length=1)
    voice: str = "en-US-EmmaNeural"
    source_type: str = Field(default="text", pattern="^(pdf|text)$")
    document_id: int | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_storage()
    init_db()
    yield


app = FastAPI(title="VOXA API", version="0.1.0", lifespan=lifespan)
ensure_storage()
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)) -> dict:
    result = await save_and_extract_pdf(file)
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO documents (title, source_type, file_path, extracted_text, page_count)
            VALUES (?, ?, ?, ?, ?)
            """,
            (result["title"], "pdf", result["file_path"], result["text"], result["page_count"]),
        )
        document_id = cursor.lastrowid

    return {
        "document_id": document_id,
        "title": result["title"],
        "page_count": result["page_count"],
        "preview": result["preview"],
        "text": result["text"],
    }


@app.get("/voices")
async def voices() -> list[dict]:
    return curated_voices()


@app.post("/generate-audio")
async def generate_audio(payload: GenerateAudioRequest) -> dict:
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text is required.")

    audio = await generate_audio_file(payload.title, payload.text, payload.voice)
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO audio_generations (document_id, title, source_type, voice, audio_path, duration)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                payload.document_id,
                payload.title,
                payload.source_type,
                audio["voice"],
                audio["audio_path"],
                audio["duration"],
            ),
        )
        item_id = cursor.lastrowid
        row = connection.execute(
            """
            SELECT id, title, source_type, voice, audio_path, duration, created_at
            FROM audio_generations
            WHERE id = ?
            """,
            (item_id,),
        ).fetchone()

    return dict(row)


@app.get("/history")
async def history() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, title, source_type, voice, audio_path, duration, created_at
            FROM audio_generations
            ORDER BY datetime(created_at) DESC
            """
        ).fetchall()
    return rows_to_dicts(rows)


@app.delete("/history/{item_id}")
async def delete_history(item_id: int) -> dict:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT audio_path FROM audio_generations WHERE id = ?",
            (item_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="History item not found.")
        connection.execute("DELETE FROM audio_generations WHERE id = ?", (item_id,))
    audio_file = AUDIO_DIR / Path(row["audio_path"]).name
    audio_file.unlink(missing_ok=True)
    return {"ok": True}
