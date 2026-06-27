import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from .models import AssetType

# Schema for creating a new asset (Input validation)


class AssetCreate(BaseModel):
    title: str
    description: Optional[str] = None
    asset_type: AssetType

# Schema for returning an asset (Output formatting)


class AssetResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    asset_type: AssetType
    file_url: Optional[str]
    created_at: datetime

    class Config:
        # Tells Pydantic to read data even if it's not a dict, but an ORM model
        from_attributes = True
