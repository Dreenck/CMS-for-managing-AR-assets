import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from .database import Base

# Define Enum for asset types


class AssetType(str, enum.Enum):
    model_3d = "3d_model"
    audio = "audio"
    marker = "marker"

# SQLAlchemy Model representing the database table


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    asset_type: Column = Column(Enum(AssetType), nullable=False)
    # Will be updated in Stage 3 after S3 upload
    file_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
