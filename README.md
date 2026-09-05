# Ruang Aman — Privacy-First Evidence & SafeMap

MVP web untuk membantu pengguna menyusun bukti kekerasan berbasis gender menjadi ringkasan yang lebih terstruktur. Aplikasi ini bukan pengganti polisi, tenaga medis, psikolog, atau bantuan hukum.

## Arsitektur

```text
Browser (Next.js/Vercel)
    ├── autentikasi → Supabase Auth
    └── request + access token → FastAPI/Render
                                  ├── metadata → PostgreSQL/Supabase
                                  ├── file sementara → private Storage
                                  └── proses → layanan ML/OCR
```

File mentah tidak disimpan di PostgreSQL. Database hanya menyimpan metadata, status proses, hash, hasil ekstraksi, dan ringkasan. Bucket Storage wajib private.

## Struktur repo

- `frontend/`: antarmuka Next.js.
- `backend/`: REST API FastAPI.
- `database/`: schema SQL dan Row Level Security Supabase.
- `ml/`: kontrak pipeline OCR dan peringkasan.
- `UI-UX/`: dokumentasi desain dan tautan Figma.
- `workflow/`: endpoint, teknologi, serta pembagian kerja.

## Menjalankan lokal

1. Salin `.env.example` menjadi `frontend/.env.local` dan `backend/.env`.
2. Jalankan `database/schema.sql`, lalu `database/policies.sql` melalui Supabase SQL Editor.
3. Buat bucket private bernama `evidence-private` di Supabase Storage.
4. Frontend: `cd frontend && npm install && npm run dev`.
5. Backend: `cd backend && python -m venv .venv`, aktifkan virtual environment, jalankan `pip install -r requirements.txt`, lalu `uvicorn app.main:app --reload`.

Frontend tersedia di `http://localhost:3000`, backend di `http://localhost:8000`, dan dokumentasi API di `http://localhost:8000/docs`.

## Aturan privasi MVP

- Jangan memasukkan data korban asli selama development/demo.
- Batasi jenis dan ukuran file sebelum upload.
- Gunakan signed URL berumur pendek; jangan membuat bucket publik.
- Hapus file mentah setelah proses selesai atau melewati `expires_at`.
- Jangan mencatat access token, isi kronologi, atau isi bukti ke log.
- Hasil ML adalah bantuan penyusunan, bukan penetapan fakta atau keputusan hukum.

## Status

Repo ini adalah scaffold MVP. Endpoint kasus tersedia sebagai contoh terproteksi; upload, pipeline ML, dan SafeMap masih berupa kontrak yang harus dilanjutkan tim.
