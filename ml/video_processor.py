from __future__ import annotations

import json
import sys
import wave
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import av

try:
    from .ocr import extract_text_from_image
    from .transcription import transcribe_audio
except ImportError:
    from ocr import extract_text_from_image
    from transcription import transcribe_audio


ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov"}
MAX_FILE_SIZE = 25 * 1024 * 1024
MAX_DURATION_SECONDS = 10 * 60
MAX_FRAMES = 5


def validate_video(video_path: str | Path) -> tuple[Path, float]:
    path = Path(video_path).resolve()

    if not path.is_file():
        raise FileNotFoundError("File video tidak ditemukan.")

    if path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise ValueError("Format video tidak didukung.")

    if path.stat().st_size == 0:
        raise ValueError("File video kosong.")

    if path.stat().st_size > MAX_FILE_SIZE:
        raise ValueError("Ukuran video melebihi 25 MB.")

    try:
        with av.open(str(path)) as container:
            duration = (
                float(container.duration / av.time_base)
                if container.duration is not None
                else 0.0
            )

            if not container.streams.video:
                raise ValueError("File tidak memiliki stream video.")
    except (av.AVError, OSError) as error:
        raise ValueError(
            "Video rusak atau tidak dapat dibaca."
        ) from error

    if duration > MAX_DURATION_SECONDS:
        raise ValueError("Durasi video melebihi 10 menit.")

    return path, duration


def extract_audio(video_path: Path, output_path: Path) -> bool:
    """
    ambil audio video untuk jadi wav mono 16 khz
    """
    with av.open(str(video_path)) as container:
        if not container.streams.audio:
            return False

        resampler = av.AudioResampler(
            format="s16",
            layout="mono",
            rate=16000
        )

        with wave.open(str(output_path), "wb") as audio_file:
            audio_file.setnchannels(1)
            audio_file.setsampwidth(2)
            audio_file.setframerate(16000)

            for frame in container.decode(audio=0):
                for converted_frame in resampler.resample(frame):
                    audio_file.writeframes(
                        converted_frame.to_ndarray().tobytes()
                    )

            for converted_frame in resampler.resample(None):
                audio_file.writeframes(
                    converted_frame.to_ndarray().tobytes()
                )

    return output_path.is_file() and output_path.stat().st_size > 44


def extract_frames(
    video_path: Path,
    output_directory: Path,
    duration: float
) -> list[Path]:
    """
    ambil maksimal lima frame agar proses OCR tidak terlalu berat.
    """
    if duration > 0:
        target_times = [
            duration * (index + 1) / (MAX_FRAMES + 1)
            for index in range(MAX_FRAMES)
        ]
    else:
        target_times = [0, 5, 10, 15, 20]

    frame_paths = []
    target_index = 0

    with av.open(str(video_path)) as container:
        stream = container.streams.video[0]
        stream.thread_type = "AUTO"

        for frame in container.decode(stream):
            if target_index >= len(target_times):
                break

            frame_time = float(frame.time or 0)

            if frame_time < target_times[target_index]:
                continue

            frame_path = (
                output_directory /
                f"frame_{target_index + 1}.png"
            )

            frame.to_image().save(frame_path, format="PNG")
            frame_paths.append(frame_path)
            target_index += 1

    return frame_paths


def remove_duplicate_text(texts: list[str]) -> list[str]:
    result = []
    seen = set()

    for text in texts:
        normalized = " ".join(text.lower().split())

        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(text.strip())

    return result


def process_video(video_path: str | Path) -> dict[str, Any]:
    """
    olah audio dan tulisan yang muncul dalam video.
    """
    path, duration = validate_video(video_path)

    transcription_result = None
    frame_results = []

    with TemporaryDirectory(prefix="ruang_aman_") as temp:
        temp_directory = Path(temp)
        audio_path = temp_directory / "audio.wav"

        if extract_audio(path, audio_path):
            transcription_result = transcribe_audio(audio_path)

        frame_paths = extract_frames(
            path,
            temp_directory,
            duration
        )

        for frame_path in frame_paths:
            ocr_result = extract_text_from_image(frame_path)

            if ocr_result["text"]:
                frame_results.append({
                    "frame": frame_path.name,
                    "text": ocr_result["text"],
                    "confidence": ocr_result["confidence"]
                })

    frame_texts = remove_duplicate_text([
        result["text"] for result in frame_results
    ])

    ocr_text = "\n".join(frame_texts)

    transcription_text = (
        transcription_result["text"]
        if transcription_result
        else ""
    )

    combined_text = "\n".join(
        text for text in [
            transcription_text,
            ocr_text
        ]
        if text
    )

    return {
        "success": True,
        "type": "video",
        "duration": round(duration, 2),
        "transcription": transcription_text,
        "ocr_text": ocr_text,
        "combined_text": combined_text,
        "frames_analyzed": len(frame_results),
        "frame_results": frame_results
    }


def main() -> None:
    """
    test python video_processor.py record.mp4
    """
    if len(sys.argv) != 2:
        print(
            "Penggunaan: "
            "python video_processor.py <path-video>"
        )
        raise SystemExit(1)

    try:
        result = process_video(sys.argv[1])

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

