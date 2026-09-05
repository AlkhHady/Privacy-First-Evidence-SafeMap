from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CaseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    chronology: str = Field(default="", max_length=20_000)


class CaseOut(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    chronology: str
    status: str
    created_at: datetime
