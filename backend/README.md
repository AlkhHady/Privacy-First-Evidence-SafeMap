# Backend Ruang Aman

FastAPI menjadi satu-satunya backend/API. Supabase Auth menerbitkan access token; backend memverifikasi token tersebut dan menggunakan `sub` sebagai ID pengguna.

```bash
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload
pytest
```

Service role key hanya boleh berada di environment backend Render. Jangan pernah memberi key ini ke frontend.
