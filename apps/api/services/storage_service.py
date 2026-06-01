from __future__ import annotations

import re
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
STORAGE_ROOT = ROOT / "storage"
UPLOADS_DIR = STORAGE_ROOT / "uploads"
AUDIO_DIR = STORAGE_ROOT / "audio"


def ensure_storage() -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def safe_title(filename: str) -> str:
    stem = Path(filename).stem.strip() or "Untitled"
    clean = re.sub(r"[_-]+", " ", stem)
    return clean[:120]


def storage_name(original_name: str, suffix: str) -> str:
    stem = re.sub(r"[^a-zA-Z0-9]+", "-", Path(original_name).stem).strip("-").lower() or "voxa"
    return f"{stem}-{uuid4().hex[:10]}{suffix}"


def public_audio_path(path: Path) -> str:
    return f"/audio/{path.name}"
