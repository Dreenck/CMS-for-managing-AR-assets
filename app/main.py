from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List
from scalar_fastapi import get_scalar_api_reference

from . import models, schemas
from .database import engine, get_db
from .s3_service import generate_presigned_url

# Initialize FastAPI application
app = FastAPI(
    title="AR Headless CMS API",
    description="Backend for managing AR assets (3D models, audio, markers)",
    version="1.0.0"
)

# Create database tables on startup


@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        # In production, use Alembic for migrations instead of create_all
        await conn.run_sync(models.Base.metadata.create_all)

# CRUD: Create a new asset entry


@app.post("/api/v1/assets", response_model=schemas.AssetResponse, status_code=201)
async def create_asset(asset: schemas.AssetCreate, db: AsyncSession = Depends(get_db)):
    new_asset = models.Asset(
        title=asset.title,
        description=asset.description,
        asset_type=asset.asset_type
    )
    db.add(new_asset)
    await db.commit()
    await db.refresh(new_asset)
    return new_asset

# CRUD: Get a list of all assets


@app.get("/api/v1/assets", response_model=List[schemas.AssetResponse])
async def get_assets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Asset))
    assets = result.scalars().all()
    return assets


# Schema for the incoming request
class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: str


# Route to get the presigned URL
@app.post("/api/v1/upload-url", summary="Get Presigned URL for direct S3 upload")
async def get_upload_url(request: PresignedUrlRequest):
    """
    Returns a temporary URL that allows the client to upload a file 
    directly to the S3 bucket without passing through this server.
    """
    upload_data = await generate_presigned_url(request.filename, request.content_type)

    if not upload_data:
        raise HTTPException(
            status_code=500, detail="Could not generate upload URL")

    return upload_data


# Scalar for better docs
@app.get("/scalar", include_in_schema=False)
async def scalar_html():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
    )
