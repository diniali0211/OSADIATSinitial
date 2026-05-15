import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///.ats.db")

if DATABASE_URL.startswith("postgres://"):
    DATABAESE_URL = DATBASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
)

engine = create_async_engine(
  DATABASE_URL,
  echo=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
  async with SessionLocal() as session:
      yield session
