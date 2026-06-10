from fastapi import FastAPI, Response, Request
from fastapi import Depends
import minio_api 
import routers
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import models, crud
import schemas
from database import engine, Base, init_models
from deps import get_session
import asyncio
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta, timezone
from jose import jwt, ExpiredSignatureError, JWTError
from startup_conf import fill_role_model
from middleware import AuthMiddleware

app = FastAPI()

app.add_middleware(AuthMiddleware)

app.add_middleware(
     CORSMiddleware,
     allow_origins=["*"],
     allow_credentials=True,
     allow_methods=["*"],
     allow_headers=["*"],
 )


app.include_router(minio_api.minio_router)
app.include_router(routers.auth_router)
app.include_router(routers.book_router)
app.include_router(routers.user_router)
app.include_router(routers.session_router)
app.include_router(routers.session_note_router)
app.include_router(routers.session_quote_router)
app.include_router(routers.answer_router)
app.include_router(routers.solo_session_router)
app.include_router(routers.solo_session_note_router)
app.include_router(routers.solo_session_quote_router)
app.include_router(routers.ws_router)


@app.on_event("startup")
async def on_startup():
    """
    Попытки подключиться к БД и инициализировать модели (create_all) с ретраями.
    Если БД не готова сразу (например, при поднятии контейнеров), код будет ждать.
    """
    max_retries = 10        # сколько раз пробуем
    delay = 1.0             # начальная задержка в секундах
    max_delay = 10.0        # максимальная задержка
    for attempt in range(1, max_retries + 1):
        try:
            await init_models()
            async for db in get_session():
                await fill_role_model(db)
                break
            break
        except Exception as e:
            if attempt == max_retries:
                # Если последний попытка — пробрасываем исключение, чтобы приложение упало и лог показал причину.
                raise
            # Ждём перед следующей попыткой (экспоненциальный бэкофф)
            await asyncio.sleep(delay)
            delay = min(delay * 2, max_delay)



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True, workers=1)






