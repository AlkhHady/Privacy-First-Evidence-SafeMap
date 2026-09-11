const express = require("express");
const multer = require("multer");
const riskZones = require("./riskZones");
const {
  validateChronology,
  validateFiles,
  readEvidenceFiles,
  processWithML
} = require("./routes/process");


const app = express();
const PORT = process.env.PORT || 3000;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_TOTAL_SIZE = 60 * 1024 * 1024;
const EVIDENCE_BUCKET = "evidence-private";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 10 }
});

app.use(express.json({ limit: "1mb" }));

function isAllowedOrigin(origin) {
  if (!origin) return true;

  const configuredOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  const localOrigins = ["http://localhost:5500", "http://127.0.0.1:5500"];
  const vercelFrontend = /^https:\/\/privacy-first-evidence-safe-map(?:-[a-z0-9-]+)?\.vercel\.app$/;

  return configuredOrigins.includes(origin)
    || localOrigins.includes(origin)
    || vercelFrontend.test(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(isAllowedOrigin(origin) ? 204 : 403);
  }

  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ success: false, message: "Origin tidak diizinkan" });
  }

  next();
});

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Ruang Aman Backend API" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Ruang Aman Backend is running" });
});

app.get("/api/risk-zones", (req, res) => {
  res.json({
    success: true,
    data: riskZones
  });
});

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    const error = new Error("Sesi login tidak ditemukan");
    error.statusCode = 401;
    throw error;
  }

  return token;
}

async function getAuthenticatedUser(req) {
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    const error = new Error("Konfigurasi Supabase backend belum tersedia");
    error.statusCode = 503;
    throw error;
  }

  const token = getBearerToken(req);
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = new Error("Sesi login tidak valid atau sudah berakhir");
    error.statusCode = 401;
    throw error;
  }

  return response.json();
}

function validateStoredFile(file, userId, caseId, supabaseUrl) {
  if (!file || !file.signedUrl || !file.originalName) {
    throw new Error("Data file bukti tidak lengkap");
  }

  let signedUrl;
  try {
    signedUrl = new URL(file.signedUrl);
  } catch {
    throw new Error("URL bukti tidak valid");
  }

  const allowedOrigin = new URL(supabaseUrl).origin;
  const decodedPath = decodeURIComponent(signedUrl.pathname);
  const expectedPrefix = `/storage/v1/object/sign/${EVIDENCE_BUCKET}/${userId}/${caseId}/`;

  if (signedUrl.origin !== allowedOrigin || !decodedPath.startsWith(expectedPrefix)) {
    const error = new Error("Lokasi file bukti tidak diizinkan");
    error.statusCode = 403;
    throw error;
  }

  return signedUrl.toString();
}

async function downloadStoredFiles(files, userId, caseId) {
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  let totalSize = 0;
  const downloadedFiles = [];

  for (const file of files) {
    const signedUrl = validateStoredFile(file, userId, caseId, supabaseUrl);
    const response = await fetch(signedUrl);

    if (!response.ok) {
      throw new Error(`Gagal membaca ${file.originalName} dari penyimpanan`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    totalSize += buffer.length;

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`${file.originalName} melebihi batas 25 MB`);
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      throw new Error("Total file untuk satu proses maksimal 60 MB");
    }

    downloadedFiles.push({
      originalname: file.originalName,
      mimetype: file.mimeType || response.headers.get("content-type") || "application/octet-stream",
      size: buffer.length,
      buffer
    });
  }

  return readEvidenceFiles(validateFiles(downloadedFiles));
}

// Jalur utama frontend: file tetap di Supabase, backend menerima signed URL sementara.
app.post("/process-stored", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const chronology = validateChronology(req.body.chronology);
    const title = String(req.body.title || "").trim();
    const caseId = String(req.body.caseId || "").trim();
    const files = Array.isArray(req.body.files) ? req.body.files : [];

    if (!caseId) throw new Error("ID laporan wajib tersedia");
    validateFiles(files.map(file => ({
      originalname: file.originalName,
      mimetype: file.mimeType,
      size: file.sizeBytes || 0,
      buffer: Buffer.alloc(1)
    })));

    const evidence = await downloadStoredFiles(files, user.id, caseId);
    const mlResult = await processWithML(evidence, chronology, title);

    res.json({
      success: true,
      message: "Bukti berhasil diproses",
      data: { caseId, fileCount: evidence.length, ml: mlResult }
    });
  } catch (error) {
    console.error("process-stored:", error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Bukti gagal diproses"
    });
  }
});

// Jalur uji manual. Untuk produksi, gunakan /process-stored agar tidak terkena batas upload Vercel.
app.post(
  "/process",
  upload.fields([{ name: "files", maxCount: 10 }, { name: "file", maxCount: 1 }]),
  async (req, res) => {
    try {
      const chronology = validateChronology(req.body.chronology);
      const files = [...(req.files?.files || []), ...(req.files?.file || [])];
      const evidence = readEvidenceFiles(validateFiles(files));
      const mlResult = await processWithML(evidence, chronology, req.body.title || "");

      res.json({
        success: true,
        message: "Data berhasil diproses",
        data: { fileCount: evidence.length, ml: mlResult }
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }
);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "Ukuran setiap file maksimal 25 MB"
      : "File tidak dapat diterima";
    return res.status(400).json({ success: false, message });
  }

  console.error(err);
  res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
});

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
