"use strict";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "mp3",
  "wav",
  "m4a",
  "mp4",
  "mov",
  "webm",
  "pdf",
  "doc",
  "docx",
  "txt"
];

const form = document.getElementById("evidence-form");
const titleInput = document.getElementById("evidence-title");
const categoryInput = document.getElementById("evidence-category");
const dateInput = document.getElementById("incident-date");
const descriptionInput = document.getElementById("description");
const fileInput = document.getElementById("evidence-file");

const uploadArea = document.getElementById("upload-area");
const filePreview = document.getElementById("file-preview");
const fileName = document.getElementById("file-name");
const fileSize = document.getElementById("file-size");
const fileIcon = document.getElementById("file-icon");
const removeFileButton = document.getElementById("remove-file");

const characterCount = document.getElementById("character-count");
const submitButton = document.getElementById("submit-button");
const formAlert = document.getElementById("form-alert");

let selectedFile = null;

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} byte`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

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
  if (!file) {
    return "Pilih satu file bukti.";
  }

  const extension = getExtension(file.name);

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return "Format file tidak didukung.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "Ukuran file maksimal 4 MB.";
  }

  return "";
}

function displayFile(file) {
  const error = validateFile(file);

  if (error) {
    selectedFile = null;
    fileInput.value = "";
    filePreview.classList.add("hidden");
    document.getElementById("file-error").textContent = error;
    return;
  }

  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  fileIcon.textContent = getFileIcon(file);

  document.getElementById("file-error").textContent = "";
  filePreview.classList.remove("hidden");
}

function removeSelectedFile() {
  selectedFile = null;
  fileInput.value = "";
  filePreview.classList.add("hidden");
  document.getElementById("file-error").textContent = "";
}

function validateForm() {
  let valid = true;

  hideAlert();

  if (titleInput.value.trim().length < 3) {
    showError(
      titleInput,
      "title-error",
      "Judul minimal terdiri dari 3 karakter."
    );
    valid = false;
  } else {
    clearError(titleInput, "title-error");
  }

  if (!categoryInput.value) {
    showError(
      categoryInput,
      "category-error",
      "Pilih kategori kejadian."
    );
    valid = false;
  } else {
    clearError(categoryInput, "category-error");
  }

  if (!dateInput.value) {
    showError(
      dateInput,
      "date-error",
      "Tanggal kejadian harus diisi."
    );
    valid = false;
  } else {
    clearError(dateInput, "date-error");
  }

  if (descriptionInput.value.trim().length < 10) {
    showError(
      descriptionInput,
      "description-error",
      "Keterangan minimal terdiri dari 10 karakter."
    );
    valid = false;
  } else {
    clearError(descriptionInput, "description-error");
  }

  const fileError = validateFile(selectedFile);
  document.getElementById("file-error").textContent = fileError;

  if (fileError) {
    valid = false;
  }

  return valid;
}

function createTemporaryReport() {
  const savedReports = JSON.parse(
    localStorage.getItem("ruangAmanReports") || "[]"
  );

  const reportId = `RA-${Date.now()}`;

  const report = {
    id: reportId,
    title: titleInput.value.trim(),
    category: categoryInput.value,
    incidentDate: dateInput.value,
    description: descriptionInput.value.trim(),
    fileName: selectedFile.name,
    fileType: selectedFile.type,
    createdAt: new Date().toISOString(),
    status: "Menunggu Diproses",
    summary: "Bukti sudah diterima dan menunggu proses analisis.",
    timeline: [
      {
        date: new Date().toISOString(),
        label: "Laporan dibuat"
      },
      {
        date: new Date().toISOString(),
        label: "Bukti berhasil ditambahkan"
      }
    ]
  };

  savedReports.unshift(report);

  localStorage.setItem(
    "ruangAmanReports",
    JSON.stringify(savedReports)
  );

  return reportId;
}

descriptionInput.addEventListener("input", function () {
  characterCount.textContent = descriptionInput.value.length;
});

fileInput.addEventListener("change", function () {
  displayFile(fileInput.files[0]);
});

removeFileButton.addEventListener("click", removeSelectedFile);

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
  const droppedFile = event.dataTransfer.files[0];
  displayFile(droppedFile);
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
      window.location.href =
        `report-detail.html?id=${encodeURIComponent(reportId)}`;
    }, 700);
  } catch (error) {
    console.error(error);

    showAlert(
      "Bukti belum berhasil disimpan. Silakan coba kembali.",
      true
    );

    submitButton.disabled = false;
    submitButton.textContent = "Simpan";
  }
});
