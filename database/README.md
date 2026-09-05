# Database Supabase

Jalankan berurutan melalui Supabase SQL Editor:

1. `schema.sql` untuk tabel, enum, indeks, dan trigger.
2. `policies.sql` untuk mengaktifkan Row Level Security.

Jangan membuat tabel password. Identitas pengguna berasal dari `auth.users`; tabel `profiles` hanya menyimpan atribut aplikasi.
