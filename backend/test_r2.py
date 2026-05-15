import boto3
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="/home/atsosadi/OSADIATSinitial/backend/.env")

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{os.getenv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
    region_name="auto",
    verify=False

)

print(s3.list_buckets())
