const path = require("path");

const MAX_FILES = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp",
  ".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac",
  ".mp4", ".mov", ".txt"
]);

function validateChronology(chronology) {
  if (!chronology || chronology.trim() === "") {
    throw new Error("Kronologi tidak boleh kosong");
  }

  return chronology.trim();
}

function validateFile(file) {
  if (!file) throw new Error("File bukti wajib diunggah");

  const extension = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(`Format ${extension || "file"} tidak didukung`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${file.originalname} melebihi batas 25 MB`);
  }

  return file;
}

function validateFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("Minimal satu file bukti wajib diunggah");
  }

  if (files.length > MAX_FILES) {
    throw new Error(`Maksimal ${MAX_FILES} file dalam satu laporan`);
  }

  return files.map(validateFile);
}

function readEvidenceFile(file) {
  if (!file.buffer) throw new Error("File tidak dapat dibaca");

  return {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer
  };
}

function readEvidenceFiles(files) {
  return files.map(readEvidenceFile);
}

async function processWithML(files, chronology, title = "") {
  const mlUrl = (process.env.ML_API_URL || "").replace(/\/$/, "");
  const mlApiKey = process.env.ML_API_KEY;

  if (!mlUrl || !mlApiKey) {
    const error = new Error("Konfigurasi ML belum tersedia");
    error.statusCode = 503;
    throw error;
  }

  const evidenceFiles = Array.isArray(files) ? files : [files];
  validateFiles(evidenceFiles);

  const formData = new FormData();
  for (const file of evidenceFiles) {
    const fileBlob = new Blob([file.buffer], { type: file.mimetype });
    formData.append("files", fileBlob, file.originalname);
  }
  formData.append("chronology", chronology);
  formData.append("title", title);

  let response;
  try {
    response = await fetch(`${mlUrl}/process`, {
      method: "POST",
      headers: { "x-ml-api-key": mlApiKey },
      body: formData
    });
  } catch {
    const error = new Error("Server ML tidak dapat dihubungi. Pastikan laptop dan tunnel Cloudflare aktif.");
    error.statusCode = 503;
    throw error;
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.detail || result.message || "ML gagal memproses bukti");
    error.statusCode = response.status >= 500 ? 503 : 400;
    throw error;
  }

  return result;
}

module.exports = {
  validateChronology,
  validateFile,
  validateFiles,
  readEvidenceFile,
  readEvidenceFiles,
  processWithML
};
