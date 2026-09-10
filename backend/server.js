const express = require("express");
const {
  validateChronology,
  validateFile,
  readEvidenceFile,
  processWithML
} = require("./routes/process");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// Agar backend bisa membaca JSON dari frontend
app.use(express.json());

// vercel endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Ruang Aman Backend API"
  });
});

// Endpoint untuk mengecek apakah server hidup
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Ruang Aman Backend is running"
  });
});

// Endpoint /process
app.post("/process", upload.single("file"), async (req, res) => {
  console.log("CONTENT-TYPE:", req.headers["content-type"]);
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  try {
    const chronology = validateChronology(req.body.chronology);
    const file = validateFile(req.file);
    const evidence = readEvidenceFile(file);
    const mlResult = await processWithML(  // ubah const ml result
    evidence,
    chronology,
    req.body.title || ""
);

    res.json({
      success: true,
      message: "Data berhasil diproses",
      data: {
        chronology: chronology,
        file: {
          originalname: evidence.originalname,
          mimetype: evidence.mimetype,
          size: evidence.size
        },
        ml: mlResult
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Menangani error dari Multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Ukuran file maksimal 5 MB"
      });
    }
  }

  res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server"
  });
});

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;

