import { supabase } from "./supabase.js";

export async function createCase({ userId, title, category, chronology, incidentDate }) {
  const { data, error } = await supabase.from("cases").insert({
    user_id: userId,
    title,
    category,
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

export async function updateCaseStatus(caseId, status) {
  const { error } = await supabase.from("cases").update({ status }).eq("id", caseId);
  if (error) throw new Error(`Gagal memperbarui status laporan: ${error.message}`);
}

export async function updateEvidenceStatus(caseId, status, deletedAt = null) {
  const changes = { status };
  if (deletedAt) changes.deleted_at = deletedAt;
  const { error } = await supabase.from("evidence").update(changes).eq("case_id", caseId);
  if (error) throw new Error(`Gagal memperbarui status bukti: ${error.message}`);
}

export async function saveAnalysisResult(caseId, result) {
  const confidenceValue = Number(result.confidence);
  const row = {
    case_id: caseId,
    combined_text: result.combined_text || "",
    summary: result.summary || "",
    key_points: Array.isArray(result.key_points) ? result.key_points : [],
    confidence: Number.isFinite(confidenceValue) ? confidenceValue : null,
    model_name: result.model_name || ""
  };

  const { error } = await supabase.from("analysis_results")
    .upsert(row, { onConflict: "case_id" });
  if (error) throw new Error(`Gagal menyimpan hasil analisis: ${error.message}`);
}

export async function getReports() {
  const { data, error } = await supabase.from("cases").select(`
    id,
    title,
    category,
    chronology,
    incident_date,
    status,
    created_at,
    evidence (original_name, mime_type, size_bytes, status),
    analysis_results (summary, key_points, combined_text, model_name)
  `).order("created_at", { ascending: false });

  if (error) throw new Error(`Gagal membaca laporan: ${error.message}`);
  return data || [];
}

export async function deleteCase(caseId) {
  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) console.error("Gagal membersihkan laporan:", error.message);
}
