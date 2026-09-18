"""Natural Soundbox voice, generated ahead of time.

Gemini's TTS takes ~9 s per line -- far too slow to call live -- so the lines the
demo speaks are generated once (`python3 -m app.warm`) and stored on disk. The
server only ever serves files that already exist; anything else falls back to the
browser's own voice, so a missing file can never stall the demo.
"""
from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

DIR = Path(__file__).resolve().parents[1] / "tts_cache"
MODEL = "gemini-3.1-flash-tts-preview"
VOICE = "Kore"
EXT, MEDIA_TYPE = (".m4a", "audio/mp4") if shutil.which("afconvert") else (".wav", "audio/wav")


def _path(text: str) -> Path:
    return DIR / (hashlib.sha256(text.strip().encode()).hexdigest()[:20] + EXT)


def cached(text: str) -> Path | None:
    p = _path(text)
    return p if p.exists() else None


def generate(text: str) -> Path:
    """Call Gemini TTS once and store the result. Raises on failure."""
    p = _path(text)
    if p.exists():
        return p
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    r = client.models.generate_content(
        model=MODEL, contents=f"Say warmly and clearly, like a shop assistant: {text}",
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICE)))))
    pcm = r.candidates[0].content.parts[0].inline_data.data     # 16-bit mono, 24 kHz
    DIR.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "a.wav"
        with wave.open(str(wav), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
        if EXT == ".m4a":                                          # ~12x smaller than wav
            subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000",
                            str(wav), str(p)], check=True, capture_output=True)
        else:
            shutil.move(str(wav), p)
    return p
