from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
from scalar_fastapi import get_scalar_api_reference
from fastapi.middleware.cors import CORSMiddleware

from . import models, schemas
from .database import engine, get_db
from .services.s3_service import generate_presigned_url, INTERNAL_ENDPOINT_URL, ACCESS_KEY, SECRET_KEY, BUCKET_NAME, session
from .core.asset_config import ASSET_RULES
import uuid




app = FastAPI(
    title="AR Headless CMS API",
    description="Backend for managing AR assets (3D models, audio, markers)",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)


@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        # In production, use Alembic for migrations instead of create_all
        await conn.run_sync(models.Base.metadata.create_all)


@app.get("/api/v1/assets/rules", summary="Get file upload rules and size limits")
async def get_asset_rules():
    serializable_rules = {}
    for asset_type, rule in ASSET_RULES.items():
        serializable_rules[asset_type.value] = {
            "extensions": list(rule.get("extensions", [])),
            "max_size_mb": rule.get("max_size_mb", 10)
        }
    return serializable_rules


@app.post("/api/v1/assets", response_model=schemas.AssetResponse, status_code=201)
async def create_asset(asset: schemas.AssetCreate, db: AsyncSession = Depends(get_db)):
    new_asset = models.Asset(
        title=asset.title,
        description=asset.description,
        asset_type=asset.asset_type,
        file_url=asset.file_url,
        is_public=asset.is_public,
        owner_id=asset.owner_id
    )
    db.add(new_asset)
    await db.commit()
    await db.refresh(new_asset)
    return new_asset


@app.get("/api/v1/assets", response_model=List[schemas.AssetResponse])
async def get_assets(
    public_only: bool = False,
    owner_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(models.Asset)
    if public_only:
        stmt = stmt.where(models.Asset.is_public)
    if owner_id:
        stmt = stmt.where(models.Asset.owner_id == owner_id)
    result = await db.execute(stmt)
    assets = result.scalars().all()
    return assets


@app.delete("/api/v1/assets/{asset_id}", status_code=204)
async def delete_asset(asset_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Asset).where(models.Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.file_url:
        # Extract filename (key) from file_url
        file_key = asset.file_url.split("/")[-1]
        try:
            async with session.client(
                's3',
                endpoint_url=INTERNAL_ENDPOINT_URL,
                aws_access_key_id=ACCESS_KEY,
                aws_secret_access_key=SECRET_KEY
            ) as s3_client:
                await s3_client.delete_object(Bucket=BUCKET_NAME, Key=file_key)
        except Exception as e:
            print(f"Error deleting file from S3: {e}")

    await db.delete(asset)
    await db.commit()
    return None


class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: str
    asset_type: models.AssetType
    file_size: int


@app.post("/api/v1/upload-url", summary="Get Presigned URL for direct S3 upload")
async def get_upload_url(request: PresignedUrlRequest):
    """
    Returns a temporary URL that allows the client to upload a file 
    directly to the S3 bucket without passing through this server.
    Also validates that the file matches size and extension constraints.
    """
    rule = ASSET_RULES.get(request.asset_type)
    if not rule:
        raise HTTPException(status_code=400, detail="Invalid asset type")

    # 1. Validate file extension
    file_ext = "." + request.filename.split(".")[-1].lower() if "." in request.filename else ""
    if file_ext not in rule.get("extensions", []):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension {file_ext} for asset type {request.asset_type.value}. Allowed: {', '.join(rule.get('extensions', []))}"
        )

    # 2. Validate file size
    max_size_mb = rule.get("max_size_mb", 10)
    max_size_bytes = max_size_mb * 1024 * 1024
    if request.file_size > max_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size ({max_size_mb}MB) for asset type {request.asset_type.value}."
        )

    upload_data = await generate_presigned_url(request.filename, request.content_type)

    if not upload_data:
        raise HTTPException(
            status_code=500, detail="Could not generate upload URL")

    return upload_data


@app.get("/scalar", include_in_schema=False)
async def scalar_html():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
    )
