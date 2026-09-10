import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { EVIDENCE_TYPES, PROCESS_STEPS, validateFile, submitEvidence } from "../js/evidence";
import "../css/evidence.css";

export default function Evidence() {
  const navigate = useNavigate();
  const [filesByType, setFilesByType] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const totalFiles = useMemo(
    () => Object.values(filesByType).reduce((sum, arr) => sum + arr.length, 0),
    [filesByType]
  );

  function handleFiles(typeKey, evidenceType, fileList) {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const validationError = incoming.map((f) => validateFile(f, evidenceType)).find(Boolean);
    if (validationError) {
      setErrors((prev) => ({ ...prev, [typeKey]: validationError }));
      return;
    }

    setErrors((prev) => ({ ...prev, [typeKey]: null }));
    setFilesByType((prev) => ({
      ...prev,
      [typeKey]: [...(prev[typeKey] || []), ...incoming],
    }));
  }

  function removeFile(typeKey, index) {
    setFilesByType((prev) => ({
      ...prev,
      [typeKey]: prev[typeKey].filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitEvidence(filesByType);
      navigate(`/laporan/${result.reportId}`);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell activeLabel="Proses Bukti">
      <div className="evidence">
        <aside className="evidence__steps">
          <p className="evidence__steps-title">Tahap</p>
          {PROCESS_STEPS.map((step, i) => (
            <div key={step.key} className={"evidence__step" + (i === 0 ? " evidence__step--active" : "")}>
              <span className="evidence__step-num">{i + 1}</span>
              <div>
                <p className="evidence__step-label">{step.label}</p>
                <p className="evidence__step-desc">{step.desc}</p>
              </div>
            </div>
          ))}
          <div className="evidence__quote">
            <p>"Setiap bukti adalah langkah menuju keadilan."</p>
          </div>
        </aside>

        <section className="evidence__panel">
          <h1>Proses Bukti</h1>
          <p className="evidence__subtitle">
            Unggah bukti digital yang kamu miliki. Pilih jenis bukti dan klik unggah.
          </p>

          {submitError && <div className="evidence__alert">{submitError}</div>}

          <div className="evidence__grid">
            {EVIDENCE_TYPES.map((type) => {
              const files = filesByType[type.key] || [];
              return (
                <div className="evidence__card" key={type.key}>
                  <p className="evidence__card-title">{type.label}</p>
                  <p className="evidence__card-hint">{type.hint}</p>

                  <label className="evidence__dropzone">
                    <input
                      type="file"
                      accept={type.accept}
                      multiple
                      hidden
                      onChange={(e) => handleFiles(type.key, type, e.target.files)}
                    />
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                    </svg>
                    <span>Klik atau drag file ke sini</span>
                    <span className="evidence__format">
                      Format: {type.formats} | Maks. {type.maxSizeMb} MB
                    </span>
                  </label>

                  {errors[type.key] && <p className="evidence__error">{errors[type.key]}</p>}

                  {files.length > 0 && (
                    <ul className="evidence__filelist">
                      {files.map((f, i) => (
                        <li key={f.name + i}>
                          <span>{f.name}</span>
                          <button type="button" onClick={() => removeFile(type.key, i)} aria-label="Hapus file">
                            &times;
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    className="evidence__pick-btn"
                    onClick={(e) => e.currentTarget.previousSibling?.querySelector?.("input")?.click()}
                  >
                    Pilih File
                  </button>
                </div>
              );
            })}
          </div>

          <button type="button" className="evidence__add-other">
            <span className="evidence__add-icon">+</span>
            <span>
              <strong>Tambah Bukti Lain</strong>
              <br />
              Tambahkan jenis bukti atau catatan tambahan di sini.
            </span>
          </button>

          <div className="evidence__footer">
            <span>{totalFiles} file siap diunggah</span>
            <button
              type="button"
              className="evidence__submit"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Memproses..." : "Proses Bukti"}
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
