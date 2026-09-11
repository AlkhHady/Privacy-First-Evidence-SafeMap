import { supabase } from "./supabase.js";
import {
  createCase,
  saveEvidenceMetadata,
  saveAnalysisResult,
  updateCaseStatus,
  updateEvidenceStatus,
  deleteCase
} from "./database.js";
import {
  uploadEvidenceFiles,
  createSignedEvidenceFiles,
  removeEvidenceFiles
} from "./storage.js";
import { processStoredEvidence } from "./api.js";
import { requireAuthenticatedUser } from "./auth-guard.js";

requireAuthenticatedUser();

const MAX_FILES = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  "jpg", "jpeg", "png", "webp",
  "mp3", "wav", "mp4", "webm", "txt"
];

const form = document.getElementById("evidence-form");
const titleInput = document.getElementById("evidence-title");
const categoryInput = document.getElementById("evidence-category");
const dateInput = document.getElementById("incident-date");
const descriptionInput = document.getElementById("description");
const fileInputs = document.querySelectorAll(".evidence-file-input");
const uploadArea = document.getElementById("upload-area");
const filePreview = document.getElementById("file-preview");
const characterCount = document.getElementById("character-count");
const submitButton = document.getElementById("submit-button");
const formAlert = document.getElementById("form-alert");
const fileErrorElement = document.getElementById("file-error");
const fileSelectionStatus = document.getElementById("file-selection-status");

let selectedFiles = [];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} byte`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getExtension(filename) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function getFileIcon(file) {
  if (file.type.startsWith("image/")) return "🖼️";
  if (file.type.startsWith("audio/")) return "🎧";
  if (file.type.startsWith("video/")) return "🎬";
  return "📎";
}

function escapeHTML(value = "") {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

function showError(input, errorElementId, message) {
  input.classList.add("invalid");
  document.getElementById(errorElementId).textContent = message;
}

function clearError(input, errorElementId) {
  input.classList.remove("invalid");
  document.getElementById(errorElementId).textContent = "";
}

function showAlert(message, isError = false) {
  formAlert.textContent = message;
  formAlert.classList.remove("hidden");
  formAlert.classList.toggle("error", isError);
}

function hideAlert() {
  formAlert.classList.add("hidden");
  formAlert.classList.remove("error");
}

function validateFile(file) {
  if (!ALLOWED_EXTENSIONS.includes(getExtension(file.name))) {
    return `${file.name}: format tidak didukung.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name}: ukuran maksimal 25 MB.`;
  }
  return "";
}

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function renderFiles() {
  if (selectedFiles.length === 0) {
    filePreview.innerHTML = "";
    filePreview.classList.add("hidden");
    fileSelectionStatus.textContent = "Belum ada file yang dipilih.";
    fileSelectionStatus.classList.remove("has-files");
    return;
  }

  filePreview.innerHTML = selectedFiles.map(function (file, index) {
    return `
      <div class="file-preview-item">
        <span class="file-preview-icon">${getFileIcon(file)}</span>
        <span class="file-information">
          <strong>${escapeHTML(file.name)}</strong>
          <small>${formatFileSize(file.size)}</small>
        </span>
        <button type="button" data-remove-index="${index}" aria-label="Hapus ${escapeHTML(file.name)}">×</button>
      </div>
    `;
  }).join("");

  filePreview.classList.remove("hidden");
  fileSelectionStatus.textContent = `${selectedFiles.length} file berhasil dipilih.`;
  fileSelectionStatus.classList.add("has-files");
  filePreview.querySelectorAll("[data-remove-index]").forEach(function (button) {
    button.addEventListener("click", function () {
      selectedFiles.splice(Number(button.dataset.removeIndex), 1);
      fileErrorElement.textContent = "";
      renderFiles();
    });
  });
}

function addFiles(fileList) {
  const errors = [];
  const existingKeys = new Set(selectedFiles.map(fileKey));

  Array.from(fileList).forEach(function (file) {
    const error = validateFile(file);
    if (error) {
      errors.push(error);
      return;
    }
    if (!existingKeys.has(fileKey(file))) {
      selectedFiles.push(file);
      existingKeys.add(fileKey(file));
    }
  });

  if (selectedFiles.length > MAX_FILES) {
    selectedFiles = selectedFiles.slice(0, MAX_FILES);
    errors.push(`Maksimal ${MAX_FILES} file dalam satu laporan.`);
  }

  fileInputs.forEach(input => { input.value = ""; });
  fileErrorElement.textContent = errors.join(" ");
  renderFiles();
}

function validateForm() {
  let valid = true;
  hideAlert();

  if (titleInput.value.trim().length < 3) {
    showError(titleInput, "title-error", "Judul minimal terdiri dari 3 karakter.");
    valid = false;
  } else clearError(titleInput, "title-error");

  if (!categoryInput.value) {
    showError(categoryInput, "category-error", "Pilih kategori kejadian.");
    valid = false;
  } else clearError(categoryInput, "category-error");

  if (!dateInput.value) {
    showError(dateInput, "date-error", "Tanggal kejadian harus diisi.");
    valid = false;
  } else clearError(dateInput, "date-error");

  if (descriptionInput.value.trim().length < 10) {
    showError(descriptionInput, "description-error", "Keterangan minimal terdiri dari 10 karakter.");
    valid = false;
  } else clearError(descriptionInput, "description-error");

  if (selectedFiles.length === 0) {
    fileErrorElement.textContent = "Pilih minimal satu file bukti.";
    valid = false;
  }

  return valid;
}

function saveTemporaryReport(caseId, uploadedFiles, mlResult, status, errorMessage = "") {
  const savedReports = JSON.parse(localStorage.getItem("ruangAmanReports") || "[]");
  const now = new Date().toISOString();
  const report = {
    id: caseId,
    title: titleInput.value.trim(),
    category: categoryInput.value,
    incidentDate: dateInput.value,
    description: descriptionInput.value.trim(),
    fileName: uploadedFiles[0]?.originalName || "Tidak ada file",
    evidence: uploadedFiles.map(file => ({
      name: file.originalName,
      type: file.mimeType,
      size: file.sizeBytes
    })),
    evidenceCount: uploadedFiles.length,
    createdAt: now,
    status,
    summary: mlResult?.summary || errorMessage || "Ringkasan belum tersedia.",
    analysis: Array.isArray(mlResult?.key_points) ? mlResult.key_points : [],
    modelName: mlResult?.model_name || "",
    timeline: [
      { date: now, label: "Laporan dibuat" },
      { date: now, label: `${uploadedFiles.length} bukti berhasil ditambahkan` },
      { date: now, label: status === "Selesai" ? "Analisis bukti selesai" : "Analisis bukti gagal" }
    ]
  };

  const withoutSameReport = savedReports.filter(item => item.id !== caseId);
  withoutSameReport.unshift(report);
  localStorage.setItem("ruangAmanReports", JSON.stringify(withoutSameReport));
  return caseId;
}

descriptionInput.addEventListener("input", function () {
  characterCount.textContent = descriptionInput.value.length;
});

fileInputs.forEach(function (input) {
  input.addEventListener("change", function () {
    addFiles(input.files);
  });
});

["dragenter", "dragover"].forEach(function (eventName) {
  uploadArea.addEventListener(eventName, function (event) {
    event.preventDefault();
    uploadArea.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach(function (eventName) {
  uploadArea.addEventListener(eventName, function (event) {
    event.preventDefault();
    uploadArea.classList.remove("dragging");
  });
});

uploadArea.addEventListener("drop", function (event) {
  addFiles(event.dataTransfer.files);
});

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!validateForm()) {
    showAlert("Periksa kembali data yang belum benar.", true);
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Memeriksa akun...";

  let createdCase = null;
  let uploadedFiles = [];
  let metadataSaved = false;

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Silakan login terlebih dahulu sebelum mengunggah bukti.");
    }

    submitButton.textContent = "Membuat laporan...";
    createdCase = await createCase({
      userId: user.id,
      title: titleInput.value.trim(),
      category: categoryInput.value,
      chronology: descriptionInput.value.trim(),
      incidentDate: dateInput.value
    });

    uploadedFiles = await uploadEvidenceFiles(
      selectedFiles,
      user.id,
      createdCase.id,
      (current, total) => {
        submitButton.textContent = `Mengunggah ${current}/${total}...`;
      }
    );

    submitButton.textContent = "Menyimpan data bukti...";
    await saveEvidenceMetadata(createdCase.id, uploadedFiles);
    metadataSaved = true;
    await updateCaseStatus(createdCase.id, "processing");
    await updateEvidenceStatus(createdCase.id, "processing");

    submitButton.textContent = "Menyiapkan analisis aman...";
    const signedFiles = await createSignedEvidenceFiles(uploadedFiles);

    submitButton.textContent = "ML sedang mengolah bukti...";
    const mlResult = await processStoredEvidence({
      caseId: createdCase.id,
      title: titleInput.value.trim(),
      chronology: descriptionInput.value.trim(),
      files: signedFiles
    });

    if (!mlResult?.success) {
      throw new Error(mlResult?.error || "ML tidak menghasilkan analisis.");
    }

    submitButton.textContent = "Menyimpan hasil analisis...";
    await saveAnalysisResult(createdCase.id, mlResult);
    await updateCaseStatus(createdCase.id, "completed");
    await updateEvidenceStatus(createdCase.id, "completed");

    const reportId = saveTemporaryReport(
      createdCase.id,
      uploadedFiles,
      mlResult,
      "Selesai"
    );

    submitButton.textContent = "Membersihkan bukti mentah...";
    const deleted = await removeEvidenceFiles(uploadedFiles.map(file => file.path));
    if (deleted) {
      await updateEvidenceStatus(createdCase.id, "deleted", new Date().toISOString());
    }

    showAlert(`${uploadedFiles.length} file berhasil diolah. Bukti mentah telah dibersihkan.`);
    window.setTimeout(function () {
      window.location.href = `report-detail.html?id=${encodeURIComponent(reportId)}`;
    }, 700);
  } catch (error) {
    console.error(error);

    let deletedAfterFailure = false;

    if (uploadedFiles.length) {
      deletedAfterFailure = await removeEvidenceFiles(
        uploadedFiles.map(file => file.path)
      );
    }

    if (!metadataSaved) {
      if (createdCase) await deleteCase(createdCase.id);
    } else {
      await updateCaseStatus(createdCase.id, "failed").catch(console.error);

      if (deletedAfterFailure) {
        await updateEvidenceStatus(
          createdCase.id,
          "deleted",
          new Date().toISOString()
        ).catch(console.error);
      } else {
        await updateEvidenceStatus(createdCase.id, "failed").catch(console.error);
      }

      saveTemporaryReport(
        createdCase.id,
        uploadedFiles,
        null,
        "Gagal",
        error.message
      );
    }

    showAlert(error.message || "Bukti belum berhasil diproses.", true);
    submitButton.disabled = false;
    submitButton.textContent = "Coba Lagi";
  }
});
