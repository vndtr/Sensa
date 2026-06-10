# app/deps.py
from typing import AsyncGenerator
from database import AsyncSessionLocal

async def get_session() -> AsyncGenerator:
    async with AsyncSessionLocal() as session:
        yield session
