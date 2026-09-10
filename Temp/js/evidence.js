// evidence.js
// Logic for the "Proses Bukti" (evidence intake) page: file type rules,
// validation, and the (mocked) submit-to-backend call.
// A teammate's api.js / storage.js / supabase.js would normally back onSubmitEvidence.

export const EVIDENCE_TYPES = [
  {
    key: "photo",
    label: "Foto / Screenshot",
    hint: "Unggah foto, tangkapan layar, atau gambar bukti.",
    accept: ".jpg,.jpeg,.png,.heic",
    formats: "JPG, PNG, HEIC",
    maxSizeMb: 10,
  },
  {
    key: "video",
    label: "Video",
    hint: "Unggah file video sebagai bukti.",
    accept: ".mp4,.mov,.avi",
    formats: "MP4, MOV, AVI",
    maxSizeMb: 100,
  },
  {
    key: "audio",
    label: "Audio",
    hint: "Unggah rekaman audio, seperti rekaman suara atau panggilan.",
    accept: ".mp3,.wav,.m4a",
    formats: "MP3, WAV, M4A",
    maxSizeMb: 50,
  },
  {
    key: "document",
    label: "Dokumen",
    hint: "Unggah dokumen pendukung lainnya.",
    accept: ".pdf,.doc,.docx,.rtf,.txt",
    formats: "PDF, DOC, DOCX, RTF, TXT",
    maxSizeMb: 20,
  },
];

export const PROCESS_STEPS = [
  { key: "input", label: "Input", desc: "Unggah dan masukkan bukti digital yang kamu miliki" },
  { key: "klasifikasi", label: "Klasifikasi", desc: "Bukti akan dikelompokkan secara otomatis" },
  { key: "analisis", label: "Analisis", desc: "Sistem mengekstraksi informasi penting" },
  { key: "hasil", label: "Hasil", desc: "Lihat ringkasan dan kronologi bukti" },
];

export function validateFile(file, evidenceType) {
  if (!file) return "Tidak ada file dipilih.";
  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > evidenceType.maxSizeMb) {
    return `Ukuran file melebihi batas ${evidenceType.maxSizeMb} MB.`;
  }
  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (!evidenceType.accept.split(",").includes(ext)) {
    return `Format file tidak didukung untuk ${evidenceType.label}.`;
  }
  return null;
}

// Mocked submit — swap this out for the real backend call (process.js / api.js).
export async function submitEvidence(filesByType) {
  await new Promise((r) => setTimeout(r, 900));
  const uploadedCount = Object.values(filesByType).flat().length;
  if (uploadedCount === 0) {
    throw new Error("Tambahkan minimal satu bukti sebelum melanjutkan.");
  }
  return {
    reportId: "RPT-" + Math.floor(100000 + Math.random() * 900000),
    itemCount: uploadedCount,
    status: "processing",
  };
}
