from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from .ocr import extract_text_from_image
    from .transcription import transcribe_audio
    from .video_processor import process_video
    from .summarizer import summarize_text
except ImportError:
    from ocr import extract_text_from_image
    from transcription import transcribe_audio
    from video_processor import process_video
    from summarizer import summarize_text


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
AUDIO_EXTENSIONS = {
    ".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac"
}
VIDEO_EXTENSIONS = {".mp4", ".mov"}
TEXT_EXTENSIONS = {".txt"}

MAX_FILES = 10
MAX_TEXT_FILE_SIZE = 1024 * 1024
MAX_COMBINED_TEXT = 100_000


def detect_file_type(file_path: Path) -> str:
    extension = file_path.suffix.lower()

    if extension in IMAGE_EXTENSIONS:
        return "image"

    if extension in AUDIO_EXTENSIONS:
        return "audio"

    if extension in VIDEO_EXTENSIONS:
        return "video"

    if extension in TEXT_EXTENSIONS:
        return "text"

    raise ValueError(
        f"Format {extension or 'tanpa ekstensi'} tidak didukung."
    )


def read_text_file(file_path: Path) -> str:
    if file_path.stat().st_size > MAX_TEXT_FILE_SIZE:
        raise ValueError("File teks melebihi batas 1 MB.")

    return file_path.read_text(
        encoding="utf-8",
        errors="replace"
    ).strip()


def add_unique_text(
    collection: list[str],
    text: str
) -> None:
    cleaned = text.strip()

    if cleaned and cleaned not in collection:
        collection.append(cleaned)


def process_single_file(file_path: str | Path) -> dict[str, Any]:
    path = Path(file_path).resolve()

    if not path.is_file():
        raise FileNotFoundError("File tidak ditemukan.")

    file_type = detect_file_type(path)

    if file_type == "image":
        result = extract_text_from_image(path)

    elif file_type == "audio":
        result = transcribe_audio(path)

    elif file_type == "video":
        result = process_video(path)

    else:
        result = {
            "success": True,
            "type": "text",
            "text": read_text_file(path)
        }

    return {
        "filename": path.name,
        "file_type": file_type,
        "result": result
    }


def process_evidence(
    file_paths: list[str | Path],
    chronology: str = "",
    title: str = ""
) -> dict[str, Any]:
    """
    memproses seluruh bukti lalu mendapat ringkasan
    """
    if len(file_paths) > MAX_FILES:
        raise ValueError(
            f"Maksimal {MAX_FILES} file dalam satu proses."
        )

    ocr_texts = []
    transcriptions = []
    direct_texts = []
    processed_files = []
    failed_files = []

    if chronology.strip():
        add_unique_text(direct_texts, chronology)

    for file_path in file_paths:
        path = Path(file_path)

        try:
            processed = process_single_file(path)
            result = processed["result"]
            file_type = processed["file_type"]

            if file_type == "image":
                add_unique_text(
                    ocr_texts,
                    result.get("text", "")
                )

            elif file_type == "audio":
                add_unique_text(
                    transcriptions,
                    result.get("text", "")
                )

            elif file_type == "video":
                add_unique_text(
                    ocr_texts,
                    result.get("ocr_text", "")
                )
                add_unique_text(
                    transcriptions,
                    result.get("transcription", "")
                )

            elif file_type == "text":
                add_unique_text(
                    direct_texts,
                    result.get("text", "")
                )

            processed_files.append(processed)

        except Exception as error:
            failed_files.append({
                "filename": path.name,
                "error": str(error)
            })

    sections = []

    if title.strip():
        sections.append(f"Judul laporan: {title.strip()}")

    if direct_texts:
        sections.append(
            "Kronologi atau teks pengguna:\n"
            + "\n".join(direct_texts)
        )

    if ocr_texts:
        sections.append(
            "Teks dari gambar atau video:\n"
            + "\n".join(ocr_texts)
        )

    if transcriptions:
        sections.append(
            "Transkripsi audio atau video:\n"
            + "\n".join(transcriptions)
        )

    combined_text = "\n\n".join(sections)
    combined_text = combined_text[:MAX_COMBINED_TEXT]

    if not combined_text.strip():
        return {
            "success": False,
            "error": "Tidak ada teks yang berhasil diperoleh.",
            "processed_files": processed_files,
            "failed_files": failed_files
        }

    summary_result = summarize_text(combined_text)

    return {
        "success": True,
        "title": title.strip(),
        "ocr_text": "\n".join(ocr_texts),
        "transcription": "\n".join(transcriptions),
        "combined_text": combined_text,
        "summary": summary_result["summary"],
        "key_points": summary_result["key_points"],
        "processed_file_count": len(processed_files),
        "failed_file_count": len(failed_files),
        "processed_files": processed_files,
        "failed_files": failed_files,
        "model_name": (
            "EasyOCR + faster-whisper-tiny + "
            "extractive-frequency"
        ),
        "disclaimer": (
            "Hasil ini merupakan ringkasan awal dan bukan "
            "kesimpulan hukum atau penentuan kesalahan."
        )
    }


def main() -> None:
    """
    Contoh:
    python pipeline.py bukti.jpg rekaman.mp3 \
        --chronology "Kronologi pengguna"
    """
    parser = argparse.ArgumentParser(
        description="Pipeline pengolahan bukti Ruang Aman"
    )

    parser.add_argument(
        "files",
        nargs="*",
        help="Daftar file bukti"
    )

    parser.add_argument(
        "--chronology",
        default="",
        help="Kronologi dari pengguna"
    )

    parser.add_argument(
        "--title",
        default="",
        help="Judul laporan"
    )

    arguments = parser.parse_args()

    try:
        result = process_evidence(
            arguments.files,
            chronology=arguments.chronology,
            title=arguments.title
        )

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
