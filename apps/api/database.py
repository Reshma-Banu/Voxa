from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).parent
DB_PATH = ROOT / "voxa.db"
SCHEMA_PATH = ROOT / "schema.sql"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))


def rows_to_dicts(rows: Iterable[sqlite3.Row]) -> list[dict]:
    return [dict(row) for row in rows]
