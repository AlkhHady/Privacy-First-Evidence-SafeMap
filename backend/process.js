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

async function processWithML(file) {
  // Sementara: simulasi pemanggilan Machine Learning
  return {
    status: "success",
    message: "File siap diproses oleh Machine Learning",
    filename: file.originalname
  };
}

module.exports = {
  validateChronology,
  validateFile,
  readEvidenceFile,
  processWithML
};