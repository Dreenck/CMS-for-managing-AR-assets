# app/s3_service.py
import os
import uuid
import aioboto3
from botocore.exceptions import ClientError

# Get credentials from environment variables
INTERNAL_ENDPOINT_URL = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
PUBLIC_ENDPOINT_URL = os.getenv("MINIO_PUBLIC_URL", "http://localhost:9000")
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
    
    # Use internal endpoint for server-side operations (bucket check / creation)
    async with session.client(
        's3',
        endpoint_url=INTERNAL_ENDPOINT_URL,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY
    ) as s3_client_internal:
        try:
            # Create bucket if it doesn't exist
            # Note: In production, bucket creation is usually handled separately
            try:
                await s3_client_internal.head_bucket(Bucket=BUCKET_NAME)
            except ClientError:
                await s3_client_internal.create_bucket(Bucket=BUCKET_NAME)
            
            # ponytail: Set public bucket policy and CORS so browser can fetch/render assets natively
            import json
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "PublicRead",
                        "Effect": "Allow",
                        "Principal": "*",
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{BUCKET_NAME}/*"]
                    }
                ]
            }
            await s3_client_internal.put_bucket_policy(
                Bucket=BUCKET_NAME,
                Policy=json.dumps(policy)
            )
        except Exception as e:
            print(f"Error checking/creating/configuring bucket: {e}")
            return None

    # Use public endpoint for generating the presigned URL
    async with session.client(
        's3',
        endpoint_url=PUBLIC_ENDPOINT_URL,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY
    ) as s3_client_public:
        try:
            # Generate the presigned URL for PUT request
            presigned_url = await s3_client_public.generate_presigned_url(
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
                "file_url": f"{PUBLIC_ENDPOINT_URL}/{BUCKET_NAME}/{unique_filename}"
            }
            
        except Exception as e:
            print(f"Error generating presigned URL: {e}")
            return None