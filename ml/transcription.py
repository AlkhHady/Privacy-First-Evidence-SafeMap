from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from threading import Lock
from typing import Any

import av
from faster_whisper import WhisperModel


ALLOWED_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".m4a",
    ".ogg",
    ".webm",
    ".flac"
}

MAX_FILE_SIZE = 25 * 1024 * 1024
MAX_DURATION_SECONDS = 10 * 60

_model: WhisperModel | None = None
_model_lock = Lock()
_transcription_lock = Lock()


def get_model() -> WhisperModel:
    """
    buat model hanya sekali agar ga boros ram
    """
    global _model

    if _model is None:
        with _model_lock:
            if _model is None:
                model_size = os.getenv(
                    "WHISPER_MODEL_SIZE",
                    "tiny"
                )

                model_directory = os.getenv(
                    "WHISPER_MODEL_DIR"
                )

                _model = WhisperModel(
                    model_size,
                    device="cpu",
                    compute_type="int8",
                    cpu_threads=int(
                        os.getenv("WHISPER_CPU_THREADS", "2")
                    ),
                    num_workers=1,
                    download_root=model_directory
                )

    return _model


def get_audio_duration(audio_path: Path) -> float:
    """
    baca durasi tanpa memproses seluruh audio.
    """
    try:
        with av.open(str(audio_path)) as container:
            if container.duration is None:
                return 0.0

            return float(container.duration / av.time_base)
    except av.AVError as error:
        raise ValueError(
            "File audio rusak atau tidak dapat dibaca."
        ) from error


def validate_audio(audio_path: str | Path) -> Path:
    """
    periksa file, format, ukuran, dan durasi audio.
    """
    path = Path(audio_path).resolve()

    if not path.is_file():
        raise FileNotFoundError("File audio tidak ditemukan.")

    if path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise ValueError("Format audio tidak didukung.")

    if path.stat().st_size == 0:
        raise ValueError("File audio kosong.")

    if path.stat().st_size > MAX_FILE_SIZE:
        raise ValueError("Ukuran audio melebihi 25 MB.")

    duration = get_audio_duration(path)

    if duration > MAX_DURATION_SECONDS:
        raise ValueError("Durasi audio melebihi 10 menit.")

    return path


def transcribe_audio(
    audio_path: str | Path,
    language: str | None = "id"
) -> dict[str, Any]:
    """
    mengubah suara menjadi teks menggunakan Whisper.
    """
    path = validate_audio(audio_path)
    model = get_model()

    with _transcription_lock:
        segments_generator, information = model.transcribe(
            str(path),
            language=language,
            beam_size=1,
            temperature=0,
            vad_filter=True,
            vad_parameters={
                "min_silence_duration_ms": 500
            },
            condition_on_previous_text=False,
            word_timestamps=False
        )

        segments = []

        for segment in segments_generator:
            text = " ".join(segment.text.split())

            if not text:
                continue

            segments.append({
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": text,
                "average_log_probability": round(
                    segment.avg_logprob,
                    4
                ),
                "no_speech_probability": round(
                    segment.no_speech_prob,
                    4
                )
            })

    combined_text = " ".join(
        segment["text"] for segment in segments
    )

    return {
        "success": True,
        "type": "audio",
        "text": combined_text,
        "detected_language": information.language,
        "language_probability": round(
            information.language_probability,
            4
        ),
        "duration": round(information.duration, 2),
        "segments": segments
    }


def main() -> None:
    """
    Pengujian:
    python transcription.py contoh.mp3
    """
    if len(sys.argv) != 2:
        print(
            "Penggunaan: "
            "python transcription.py <path-audio>"
        )
        raise SystemExit(1)

    try:
        result = transcribe_audio(sys.argv[1])

        print(json.dumps(
            result,
            indent=2,
            ensure_ascii=False
        ))
    except Exception as error:
        print(json.dumps({
            "success": False,
            "error": str(error)
        }, indent=2, ensure_ascii=False))

        raise SystemExit(1)


if __name__ == "__main__":
    main()

