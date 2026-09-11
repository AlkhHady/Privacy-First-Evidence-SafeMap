import { supabase } from "./supabase.js";

const BACKEND_URL = "https://privacy-first-evidence-safe-map.vercel.app";

export async function processStoredEvidence({ caseId, title, chronology, files }) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 240000);

  try {
    const response = await fetch(`${BACKEND_URL}/process-stored`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        caseId,
        title,
        chronology,
        files: files.map(file => ({
          signedUrl: file.signedUrl,
          originalName: file.originalName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes
        }))
      }),
      signal: controller.signal
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || "Backend gagal memproses bukti.");
    }

    return result.data.ml;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Proses ML terlalu lama. Coba lagi dengan file yang lebih kecil.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
