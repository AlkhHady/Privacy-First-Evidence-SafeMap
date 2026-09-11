"use strict";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  "jpg", "jpeg", "png", "webp", "mp3", "wav", "m4a",
  "mp4", "mov", "webm", "pdf", "doc", "docx", "txt"
];

const form = document.getElementById("evidence-form");
const titleInput = document.getElementById("evidence-title");
const categoryInput = document.getElementById("evidence-category");
const dateInput = document.getElementById("incident-date");
const descriptionInput = document.getElementById("description");
const fileInput = document.getElementById("evidence-file");
const uploadArea = document.getElementById("upload-area");
const filePreview = document.getElementById("file-preview");
const characterCount = document.getElementById("character-count");
const submitButton = document.getElementById("submit-button");
const formAlert = document.getElementById("form-alert");
const fileErrorElement = document.getElementById("file-error");

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
  if (file.type === "application/pdf") return "📄";
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
  filePreview.querySelectorAll("[data-remove-index]").forEach(function (button) {
    button.addEventListener("click", function () {
      selectedFiles.splice(Number(button.dataset.removeIndex), 1);
      fileErrorElement.textContent = "";
      renderFiles();
    });
  });
}

function addFiles(fileList) {
  const newFiles = Array.from(fileList);
  const errors = [];
  const existingKeys = new Set(selectedFiles.map(fileKey));

  newFiles.forEach(function (file) {
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

  fileInput.value = "";
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

function createTemporaryReport() {
  const savedReports = JSON.parse(localStorage.getItem("ruangAmanReports") || "[]");
  const reportId = `RA-${Date.now()}`;
  const evidence = selectedFiles.map(file => ({
    name: file.name,
    type: file.type,
    size: file.size
  }));

  const report = {
    id: reportId,
    title: titleInput.value.trim(),
    category: categoryInput.value,
    incidentDate: dateInput.value,
    description: descriptionInput.value.trim(),
    fileName: selectedFiles[0].name,
    fileType: selectedFiles[0].type,
    evidence,
    evidenceCount: evidence.length,
    createdAt: new Date().toISOString(),
    status: "Menunggu Diproses",
    summary: "Bukti sudah diterima dan menunggu proses analisis.",
    timeline: [
      { date: new Date().toISOString(), label: "Laporan dibuat" },
      { date: new Date().toISOString(), label: `${evidence.length} bukti berhasil ditambahkan` }
    ]
  };

  savedReports.unshift(report);
  localStorage.setItem("ruangAmanReports", JSON.stringify(savedReports));
  return reportId;
}

descriptionInput.addEventListener("input", function () {
  characterCount.textContent = descriptionInput.value.length;
});

fileInput.addEventListener("change", function () {
  addFiles(fileInput.files);
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

form.addEventListener("submit", function (event) {
  event.preventDefault();
  if (!validateForm()) {
    showAlert("Periksa kembali data yang belum benar.", true);
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Menyimpan...";

  try {
    const reportId = createTemporaryReport();
    showAlert("Bukti berhasil disimpan.");
    window.setTimeout(function () {
      window.location.href = `report-detail.html?id=${encodeURIComponent(reportId)}`;
    }, 700);
  } catch (error) {
    console.error(error);
    showAlert("Bukti belum berhasil disimpan. Silakan coba kembali.", true);
    submitButton.disabled = false;
    submitButton.textContent = "Simpan";
  }
});
