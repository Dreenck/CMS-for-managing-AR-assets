import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

load_dotenv()

DB_USER = os.getenv("POSTGRES_USER", "cms_admin")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "cms_password")
DB_NAME = os.getenv("POSTGRES_DB", "cms_database")
DB_HOST = "localhost"
DB_PORT = "5432"

SQLALCHEMY_DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create async engine
engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


Base = declarative_base()

# Dependency to get DB session for each request


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
