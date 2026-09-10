
function validateChronology(chronology) {
  if (!chronology || chronology.trim() === "") {
    throw new Error("Kronologi tidak boleh kosong");
  }

  return chronology.trim();
}

function validateFile(file) {
  if (!file) {
    throw new Error("File bukti wajib diunggah");
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf"
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error("Format file tidak didukung");
  }

  return file;
}

function readEvidenceFile(file) {
  if (!file.buffer) {
    throw new Error("File tidak dapat dibaca");
  }

  return {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer
  };
}

// final code pemanggilan ml
async function processWithML(file, chronology, title = "") {
  const mlUrl = process.env.ML_API_URL;
  const mlApiKey = process.env.ML_API_KEY;

  if (!mlUrl || !mlApiKey) {
    throw new Error("Konfigurasi ML belum tersedia");
  }

  const formData = new FormData();

  const fileBlob = new Blob(
    [file.buffer],
    { type: file.mimetype }
  );

  formData.append("file", fileBlob, file.originalname);
  formData.append("chronology", chronology);
  formData.append("title", title);

  const response = await fetch(`${mlUrl}/process`, {
    method: "POST",
    headers: {
      "x-ml-api-key": mlApiKey
    },
    body: formData
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.detail || "ML gagal memproses bukti"
    );
  }

  return result;
}

module.exports = {
  validateChronology,
  validateFile,
  readEvidenceFile,
  processWithML
};
