import { supabase } from "./supabase.js";

const EVIDENCE_BUCKET = "evidence-private";

function safeFileName(name) {
  const extension = name.includes(".") ? "." + name.split(".").pop().toLowerCase() : "";
  const baseName = name.replace(/\.[^/.]+$/, "").normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 70) || "evidence";
  return baseName + extension;
}

function normalizedMimeType(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const types = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", mp3: "audio/mpeg", wav: "audio/wav",
    mp4: "video/mp4",
    webm: file.type.startsWith("audio/") ? "audio/webm" : "video/webm",
    pdf: "application/pdf", txt: "text/plain"
  };
  return types[extension] || file.type || "application/octet-stream";
}

export function evidenceType(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  return "text";
}

export async function uploadEvidenceFiles(files, userId, caseId, onProgress) {
  const uploaded = [];
  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const path = `${userId}/${caseId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      onProgress?.(index + 1, files.length);
      const mimeType = normalizedMimeType(file);
      const { error } = await supabase.storage.from(EVIDENCE_BUCKET)
        .upload(path, file, { cacheControl: "3600", contentType: mimeType, upsert: false });
      if (error) throw new Error(`Upload ${file.name} gagal: ${error.message}`);
      uploaded.push({
        path, originalName: file.name, mimeType,
        sizeBytes: file.size, evidenceType: evidenceType(file)
      });
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) await removeEvidenceFiles(uploaded.map(item => item.path));
    throw error;
  }
}

export async function removeEvidenceFiles(paths) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).remove(paths);
  if (error) console.error("Gagal membersihkan file:", error.message);
}
