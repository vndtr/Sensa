from fastapi import FastAPI, Request, Depends
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi.exceptions import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from routers import get_current_user
from deps import get_session
from database import AsyncSessionLocal


EXCLUDE_PATHS = ["/auth/signup", "/auth/login", "/docs","/openapi.json"] 

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXCLUDE_PATHS:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse({"detail": "Not authenticated"}, status_code=401)

        token = auth_header.split(" ", 1)[1]
        async with AsyncSessionLocal() as db:
            try:
                user = await get_current_user(token, db)
                request.state.user = user
            except HTTPException as e:
                return JSONResponse({"detail": e.detail}, status_code=e.status_code)
            except Exception:
                return JSONResponse({"detail": "Not authenticated"}, status_code=401)

        response = await call_next(request)
        return response