import os
import secrets
import tempfile
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from pipeline import process_evidence


app = FastAPI(title="Ruang Aman ML API")

ML_API_KEY = os.getenv("ML_API_KEY")
MAX_FILE_SIZE = 25 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".webp",
    ".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac",
    ".mp4", ".mov",
    ".txt"
}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "message": "ML API berjalan"
    }


@app.post("/process")
async def process_files(
    files: List[UploadFile] = File(...),
    title: str = Form(""),
    chronology: str = Form(""),
    x_ml_api_key: Optional[str] = Header(default=None)
):
    if not ML_API_KEY:
        raise HTTPException(503, "ML_API_KEY belum diatur")

    if not x_ml_api_key or not secrets.compare_digest(
        x_ml_api_key,
        ML_API_KEY
    ):
        raise HTTPException(401, "API key tidak valid")

    if not files or len(files) > 10:
        raise HTTPException(400, "Jumlah file harus antara 1–10")

    with tempfile.TemporaryDirectory() as temporary_directory:
        saved_paths = []

        for number, uploaded_file in enumerate(files):
            extension = Path(
                uploaded_file.filename or ""
            ).suffix.lower()

            if extension not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    400,
                    f"Format {extension} tidak didukung"
                )

            destination = (
                Path(temporary_directory)
                / f"evidence_{number}{extension}"
            )

            file_size = 0

            with destination.open("wb") as output:
                while chunk := await uploaded_file.read(1024 * 1024):
                    file_size += len(chunk)

                    if file_size > MAX_FILE_SIZE:
                        raise HTTPException(
                            400,
                            f"{uploaded_file.filename} melebihi 25 MB"
                        )

                    output.write(chunk)

            await uploaded_file.close()
            saved_paths.append(destination)

        result = await run_in_threadpool(
            process_evidence,
            saved_paths,
            chronology,
            title
        )

        return result
