from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client, create_client

from .config import Settings, get_settings
from .dependencies import get_current_user_id
from .schemas import CaseCreate, CaseOut

app = FastAPI(title="Ruang Aman API", version="0.1.0")
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


def get_supabase(settings: Annotated[Settings, Depends(get_settings)]) -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/cases", response_model=list[CaseOut])
def list_cases(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[Client, Depends(get_supabase)],
):
    result = db.table("cases").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return result.data


@app.post("/api/v1/cases", response_model=CaseOut, status_code=201)
def create_case(
    body: CaseCreate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[Client, Depends(get_supabase)],
):
    result = db.table("cases").insert({**body.model_dump(), "user_id": user_id}).execute()
    return result.data[0]
