# app/s3_service.py
import os
import uuid
import aioboto3
from botocore.exceptions import ClientError

# Get credentials from environment variables
ENDPOINT_URL = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minio_admin")
SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minio_password")
BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "ar-assets")

session = aioboto3.Session()

async def generate_presigned_url(filename: str, file_type: str) -> dict | None:
    """
    Generates a 15-minute Presigned URL for direct upload to MinIO/S3.
    """
    # Generate a unique filename to prevent overwriting
    unique_filename = f"{uuid.uuid4()}_{filename}"
    
    async with session.client(
        's3',
        endpoint_url=ENDPOINT_URL,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY
    ) as s3_client:
        try:
            # Create bucket if it doesn't exist
            # Note: In production, bucket creation is usually handled separately
            try:
                await s3_client.head_bucket(Bucket=BUCKET_NAME)
            except ClientError:
                await s3_client.create_bucket(Bucket=BUCKET_NAME)

            # Generate the presigned URL for PUT request
            presigned_url = await s3_client.generate_presigned_url(
                ClientMethod='put_object',
                Params={
                    'Bucket': BUCKET_NAME,
                    'Key': unique_filename,
                    'ContentType': file_type
                },
                ExpiresIn=900 # 15 minutes
            )
            
            return {
                "presigned_url": presigned_url,
                "file_key": unique_filename,
                "file_url": f"{ENDPOINT_URL}/{BUCKET_NAME}/{unique_filename}"
            }
            
        except Exception as e:
            print(f"Error generating presigned URL: {e}")
            return None