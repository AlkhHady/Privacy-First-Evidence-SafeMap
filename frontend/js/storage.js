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
    m4a: "audio/mp4", ogg: "audio/ogg", flac: "audio/flac",
    mp4: "video/mp4", mov: "video/quicktime",
    webm: file.type.startsWith("audio/") ? "audio/webm" : "video/webm",
    txt: "text/plain"
  };
  return types[extension] || file.type || "application/octet-stream";
}

export function evidenceType(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
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

export async function createSignedEvidenceFiles(uploadedFiles, expiresIn = 600) {
  const paths = uploadedFiles.map(file => file.path);
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrls(paths, expiresIn);

  if (error) throw new Error(`Gagal menyiapkan bukti untuk analisis: ${error.message}`);

  return uploadedFiles.map((file, index) => {
    const signedFile = data[index];
    if (!signedFile?.signedUrl || signedFile.error) {
      throw new Error(`Gagal membuat akses sementara untuk ${file.originalName}`);
    }
    return { ...file, signedUrl: signedFile.signedUrl };
  });
}

export async function removeEvidenceFiles(paths, throwOnError = false) {
  if (!paths.length) return true;
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).remove(paths);
  if (error) {
    console.error("Gagal membersihkan file:", error.message);
    if (throwOnError) throw new Error(`Gagal menghapus bukti mentah: ${error.message}`);
    return false;
  }
  return true;
}
