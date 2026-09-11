import { supabase } from "./supabase.js";

export async function createCase({ userId, title, chronology, incidentDate }) {
  const { data, error } = await supabase.from("cases").insert({
    user_id: userId,
    title,
    chronology,
    incident_date: incidentDate,
    status: "draft"
  }).select("id, created_at").single();
  if (error) throw new Error(`Gagal membuat laporan: ${error.message}`);
  return data;
}

export async function saveEvidenceMetadata(caseId, uploadedFiles) {
  const rows = uploadedFiles.map(file => ({
    case_id: caseId,
    evidence_type: file.evidenceType,
    original_name: file.originalName,
    storage_path: file.path,
    mime_type: file.mimeType,
    size_bytes: file.sizeBytes,
    status: "uploaded"
  }));
  const { error } = await supabase.from("evidence").insert(rows);
  if (error) throw new Error(`Gagal menyimpan data bukti: ${error.message}`);
}

export async function deleteCase(caseId) {
  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) console.error("Gagal membersihkan laporan:", error.message);
}
