from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from threading import Lock
from typing import Any

import easyocr
from PIL import Image, UnidentifiedImageError


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 25 * 1024 * 1024

_reader = None
_reader_lock = Lock()


def get_reader() -> easyocr.Reader:
    """
    Membuat model OCR satu kali lalu menggunakannya kembali.
    """
    global _reader

    if _reader is None:
        with _reader_lock:
            if _reader is None:
                use_gpu = os.getenv("OCR_USE_GPU", "false").lower() == "true"

                _reader = easyocr.Reader(
                    ["id", "en"],
                    gpu=use_gpu
                )

    return _reader


def validate_image(image_path: str | Path) -> Path:
    """
    memastikan file ada, formatnya didukung, ukurannya aman,
    dan benar-benar dapat dibaca sebagai gambar
    """
    path = Path(image_path).resolve()

    if not path.is_file():
        raise FileNotFoundError("File gambar tidak ditemukan.")

    if path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise ValueError("Format gambar tidak didukung.")

    if path.stat().st_size > MAX_FILE_SIZE:
        raise ValueError("Ukuran gambar melebihi 25 MB.")

    try:
        with Image.open(path) as image:
            image.verify()
    except (UnidentifiedImageError, OSError) as error:
        raise ValueError("File bukan gambar yang valid.") from error

    return path


def extract_text_from_image(
    image_path: str | Path,
    minimum_confidence: float = 0.20
) -> dict[str, Any]:
    """
    membaca teks dari gambar dan mengembalikan hasil terstruktur
    """
    path = validate_image(image_path)
    reader = get_reader()

    results = reader.readtext(
        str(path),
        detail=1,
        paragraph=False
    )

    blocks = []

    for bounding_box, text, confidence in results:
        clean_text = " ".join(str(text).split())
        confidence = float(confidence)

        if not clean_text or confidence < minimum_confidence:
            continue

        blocks.append({
            "text": clean_text,
            "confidence": round(confidence, 4),
            "bounding_box": [
                [int(point[0]), int(point[1])]
                for point in bounding_box
            ]
        })

    combined_text = "\n".join(
        block["text"] for block in blocks
    )

    average_confidence = (
        sum(block["confidence"] for block in blocks) / len(blocks)
        if blocks else 0.0
    )

    return {
        "success": True,
        "type": "image",
        "text": combined_text,
        "confidence": round(average_confidence, 4),
        "blocks": blocks
    }


def main() -> None:
    """
    test python3 ocr.py image.jpg
    """
    if len(sys.argv) != 2:
        print("Penggunaan: python ocr.py <path-gambar>")
        raise SystemExit(1)

    try:
        result = extract_text_from_image(sys.argv[1])
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({
            "success": False,
            "error": str(error)
        }, indent=2, ensure_ascii=False))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
