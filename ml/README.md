# Pipeline ML/OCR

```text
Backend menerima metadata
  → mengambil file melalui akses server sementara
  → validasi format
  → OCR/transkripsi
  → ekstraksi informasi
  → peringkasan
  → simpan hasil dan confidence
  → tandai selesai
  → hapus file mentah sesuai kebijakan retensi
```

## Kontrak hasil minimum

```json
{
  "evidence_id": "uuid",
  "extracted_text": "teks hasil OCR atau transkripsi",
  "summary": "ringkasan netral tanpa menyimpulkan pelaku bersalah",
  "confidence": 0.82,
  "model_name": "nama-dan-versi-model"
}
```

Gunakan data fiktif untuk development. Jangan memasukkan bukti asli ke layanan AI eksternal tanpa persetujuan eksplisit, kebijakan privasi yang jelas, dan pemeriksaan aturan penyimpanan provider.
