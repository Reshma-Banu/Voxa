from __future__ import annotations

import asyncio
import subprocess
import sys
from pathlib import Path

import edge_tts

from .storage_service import AUDIO_DIR, public_audio_path, storage_name

VOICE_ALIASES = {
    "en-US-EmmaNeural": {"name": "Emma (US)", "language": "English", "gender": "Female"},
    "en-US-JennyNeural": {"name": "Jenny (US)", "language": "English", "gender": "Female"},
    "en-US-RyanMultilingualNeural": {"name": "Ryan (US)", "language": "English", "gender": "Male"},
    "en-GB-SoniaNeural": {"name": "Sonia (UK)", "language": "English", "gender": "Female"},
    "fr-FR-DeniseNeural": {"name": "Denise (FR)", "language": "French", "gender": "Female"},
}

MAX_SYNTHESIS_CHARS = 1800
SYNTHESIS_TIMEOUT_SECONDS = 120


def curated_voices() -> list[dict]:
    return [{"id": key, **value} for key, value in VOICE_ALIASES.items()]


def estimate_duration_seconds(text: str) -> int:
    words = max(1, len(text.split()))
    return max(12, round(words / 2.55))


async def generate_audio_file(title: str, text: str, voice: str) -> dict:
    voice_id = voice if voice in VOICE_ALIASES else "en-US-EmmaNeural"
    narration_text = prepare_narration_text(text)
    output = AUDIO_DIR / storage_name(title, ".mp3")
    try:
        communicate = edge_tts.Communicate(narration_text, voice_id)
        await asyncio.wait_for(communicate.save(str(output)), timeout=SYNTHESIS_TIMEOUT_SECONDS)
        if output.stat().st_size == 0:
            raise RuntimeError("edge-tts produced an empty audio file.")
    except Exception:
        output.unlink(missing_ok=True)
        output = synthesize_with_local_voice(title, narration_text)

    return {
        "audio_path": public_audio_path(output),
        "duration": estimate_duration_seconds(narration_text),
        "voice": VOICE_ALIASES[voice_id]["name"],
    }


def generate_audio_sync(title: str, text: str, voice: str) -> dict:
    return asyncio.run(generate_audio_file(title, text, voice))


def synthesize_with_local_voice(title: str, text: str) -> Path:
    if sys.platform != "win32":
        raise RuntimeError("edge-tts failed and no local speech fallback is configured for this OS.")

    output = AUDIO_DIR / storage_name(title, ".wav")
    text_file = AUDIO_DIR / storage_name(title, ".txt")
    text_file.write_text(text[:48000], encoding="utf-8")

    command = (
        "Add-Type -AssemblyName System.Speech; "
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$s.Rate = 0; $s.Volume = 100; "
        f"$text = Get-Content -LiteralPath {_ps_quote(str(text_file))} -Raw; "
        f"$s.SetOutputToWaveFile({_ps_quote(str(output))}); "
        "$s.Speak($text); $s.Dispose();"
    )
    try:
        subprocess.run(
            ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
            check=True,
            capture_output=True,
            text=True,
            timeout=180,
        )
    finally:
        text_file.unlink(missing_ok=True)

    if not output.exists() or output.stat().st_size == 0:
        raise RuntimeError("Local speech fallback did not produce audio.")
    return output


def prepare_narration_text(text: str) -> str:
    cleaned = " ".join(text.split())
    if len(cleaned) <= MAX_SYNTHESIS_CHARS:
        return cleaned

    excerpt = cleaned[:MAX_SYNTHESIS_CHARS]
    last_sentence = max(excerpt.rfind("."), excerpt.rfind("!"), excerpt.rfind("?"))
    if last_sentence > MAX_SYNTHESIS_CHARS * 0.65:
        return excerpt[: last_sentence + 1]
    return excerpt.rstrip()


def _ps_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"
