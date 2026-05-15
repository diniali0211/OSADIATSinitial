import boto3
import certifi
import os
from dotenv import load_dotenv

load_dotenv()

os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUETS_CA_BUNDLE'] = certifi.where()

R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")

s3_client = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name="auto",
    verify=False
)

def upload_pdf(file_path: str, filename: str) -> str:
    """Upload PDF to R2 and return the file key"""
    key = f"resume/{filename}"
    s3_client.upload_file(
        file_path,
        R2_BUCKET_NAME,
        key,
        ExtraArgs={"ContentType": "application/pdf"}
    )
    return key

def get_pdf_url(key: str) ->str:
    """Generate a presigned URL valid for 1 hour"""
    url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": R2_BUCKET_NAME, "Key": key},
        ExpiresIn=3600
    )
    return url
