import os
import uuid
import aioboto3
from botocore.exceptions import ClientError
from botocore.config import Config

# =========================
# INTERNAL (Docker -> MinIO)
# =========================
INTERNAL_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://minio:9000")

ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minio_admin")
SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minio_password")
BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "ar-assets")

# =========================
# PUBLIC (Browser -> MinIO)
# =========================
PUBLIC_ENDPOINT = os.getenv("MINIO_PUBLIC_URL", "http://localhost:9000")

session = aioboto3.Session()


async def generate_presigned_url(filename: str, file_type: str) -> dict | None:
    unique_filename = f"{uuid.uuid4()}_{filename}"

    async with session.client(
        "s3",
        endpoint_url=INTERNAL_ENDPOINT,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name="us-east-1",
        config=Config(signature_version="s3v4"),
    ) as s3_client:

        try:
            # Create bucket if not exists
            try:
                await s3_client.head_bucket(Bucket=BUCKET_NAME)
            except ClientError:
                await s3_client.create_bucket(Bucket=BUCKET_NAME)

            # IMPORTANT: presigned url is generated for INTERNAL endpoint
            presigned_url = s3_client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": BUCKET_NAME,
                    "Key": unique_filename,
                    "ContentType": file_type,
                },
                ExpiresIn=900,
            )

            # Replace internal docker URL with public browser URL
            presigned_url = presigned_url.replace(
                INTERNAL_ENDPOINT,
                PUBLIC_ENDPOINT
            )

            return {
                "presigned_url": presigned_url,
                "file_key": unique_filename,
                "file_url": f"{PUBLIC_ENDPOINT}/{BUCKET_NAME}/{unique_filename}",
            }

        except Exception as e:
            print(f"Error generating presigned URL: {repr(e)}")
            return None