import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from .models import AssetType



class AssetCreate(BaseModel):
    title: str
    description: Optional[str] = None
    asset_type: AssetType
    file_url: Optional[str] = None
    is_public: bool = True  
    owner_id: Optional[str] = None




class AssetUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None







class AssetResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    asset_type: AssetType
    file_url: Optional[str]
    is_public: bool
    owner_id: Optional[str]
    created_at: datetime

    class Config:
        # Tells Pydantic to read data even if it's not a dict, but an ORM model
        from_attributes = True

