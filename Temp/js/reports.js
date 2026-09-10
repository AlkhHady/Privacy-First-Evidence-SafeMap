// reports.js
// Mock data + helpers for the "Laporan" (reports list + detail) pages.
// Replace fetchReports/fetchReportById with real calls to database.js/api.js.

const MOCK_REPORTS = [
  {
    id: "RPT-482910",
    title: "Kronologi kejadian - 12 Agustus",
    status: "selesai",
    createdAt: "2026-08-12T09:20:00Z",
    itemCount: 5,
    summary:
      "Ringkasan otomatis dari 5 bukti (foto, audio, dokumen) yang menunjukkan pola kejadian selama dua minggu terakhir.",
    timeline: [
      { time: "09:00", label: "Pesan ancaman diterima melalui WhatsApp", type: "document" },
      { time: "09:15", label: "Tangkapan layar percakapan disimpan", type: "photo" },
      { time: "18:40", label: "Rekaman suara saat kejadian di rumah", type: "audio" },
    ],
    evidence: [
      { name: "chat_screenshot_1.png", type: "photo" },
      { name: "voice_note.mp3", type: "audio" },
      { name: "surat_pernyataan.pdf", type: "document" },
    ],
  },
  {
    id: "RPT-317204",
    title: "Laporan tambahan - kejadian di kampus",
    status: "diproses",
    createdAt: "2026-09-01T14:05:00Z",
    itemCount: 2,
    summary: "Sistem masih mengekstraksi informasi dari 2 bukti yang baru diunggah.",
    timeline: [{ time: "14:05", label: "Video disimpan sebagai bukti awal", type: "video" }],
    evidence: [{ name: "cctv_clip.mp4", type: "video" }],
  },
];

export function fetchReports() {
  return Promise.resolve(MOCK_REPORTS);
}

export function fetchReportById(id) {
  const found = MOCK_REPORTS.find((r) => r.id === id) || {
    ...MOCK_REPORTS[0],
    id,
    title: "Laporan baru",
    status: "diproses",
    summary: "Laporan ini baru dibuat dan sedang diproses sistem.",
  };
  return Promise.resolve(found);
}

export function statusLabel(status) {
  return { selesai: "Selesai", diproses: "Diproses", draf: "Draf" }[status] || status;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
