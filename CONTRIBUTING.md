# Panduan Kontribusi

1. Ambil issue sesuai divisi.
2. Buat branch dari `main`: `frontend/nama-fitur`, `backend/nama-fitur`, `ml/nama-fitur`, atau `docs/nama-fitur`.
3. Buat commit kecil dengan pesan jelas, misalnya `feat(frontend): add evidence form`.
4. Push branch dan buka pull request ke `main`.
5. Minimal satu anggota lain melakukan review sebelum merge.

Jangan push langsung ke `main`. Jangan commit `.env`, credential, bukti asli, atau data pribadi. Gunakan data fiktif untuk pengujian.

## Definition of done

- Fitur berjalan lokal dan tidak merusak fitur lain.
- Loading, error, dan empty state ditangani.
- Tidak ada secret atau data pribadi dalam kode/log.
- Perubahan endpoint atau database didokumentasikan.

