from __future__ import annotations

from pathlib import Path

import fitz
from fastapi import HTTPException, UploadFile

from .storage_service import UPLOADS_DIR, safe_title, storage_name


async def save_and_extract_pdf(file: UploadFile) -> dict:
    if file.content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    target = UPLOADS_DIR / storage_name(file.filename or "document.pdf", ".pdf")
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF exceeds the 50MB limit.")

    target.write_bytes(content)

    try:
        document = fitz.open(target)
    except Exception as exc:
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="The PDF could not be read.") from exc

    pages = []
    for page in document:
        text = page.get_text("text").strip()
        if text:
            pages.append(text)

    extracted = "\n\n".join(pages).strip()
    if not extracted:
        raise HTTPException(status_code=422, detail="No readable text was found in the PDF.")

    return {
        "title": safe_title(file.filename or target.name),
        "file_path": str(target),
        "text": extracted,
        "page_count": document.page_count,
        "preview": extracted[:700],
    }
