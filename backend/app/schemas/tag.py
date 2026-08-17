from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class TagBase(BaseModel):
    name: str
    color: Optional[str] = "#64748b"

class TagCreate(TagBase):
    pass

class TagResponse(TagBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
