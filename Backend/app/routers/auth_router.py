from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status, Cookie
from fastapi.security import OAuth2PasswordBearer,OAuth2PasswordRequestForm
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import models
import schemas
from deps import get_session
from dotenv import load_dotenv
import os

load_dotenv()

auth_router = APIRouter(prefix="/auth", tags=["auth"])


REFRESH_COOKIE_NAME = os.getenv("REFRESH_COOKIE_NAME")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
SECRET_KEY = os.getenv("SECRET_KEY")
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))
ALGORITHM = "HS256"
DUMMY_HASH="78y213hbjksajkdlsadv bcxz"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/signup")


# Password helpers
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Token helpers
def create_jti() -> str:    
    return sha256(f"{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()

def hash_jti(jti: str) -> str:
    return sha256(jti.encode("utf-8")).hexdigest()

def create_access_token(*, subject: str, user_id: int, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    jti = create_jti()
    payload = {
        "sub": subject,
        "user_id": user_id,
        "type": "access",
        "jti": jti,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token_payload(*, subject: str, user_id: int) -> tuple[str, str, datetime]:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    jti = create_jti()
    payload = {
        "sub": subject,
        "user_id": user_id,
        "type": "refresh",
        "jti": jti,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token, jti, expire

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен истёк",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,            
            detail=f"Невалидный токен {token}",
            headers={"WWW-Authenticate": "Bearer"},
        )

# DB helpers
async def get_user_by_username( username: str,db: AsyncSession) -> models.User:
    result = await db.execute(select(models.User).where(models.User.name == username))
    return result.scalar_one_or_none()

async def get_user_by_id( user_id: int,db: AsyncSession ) -> models.User:
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    return result.scalar_one_or_none()

async def get_refresh_record_by_jti_hash(jti_hash_value: str,db: AsyncSession  ):
    result = await db.execute(
        select(models.RefreshToken).where(models.RefreshToken.jti_hash == jti_hash_value)
    )
    return result.scalar_one_or_none()


#user heplers
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_session),) -> models.User:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Нужен access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await get_user_by_id(int(user_id),db )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
async def authenticate_user(username: str, password: str, db: AsyncSession = Depends(get_session)) -> Optional[models.User]:
    user = await get_user_by_username(username, db)
    if not user:        
        try:
            pwd_context.verify(password, DUMMY_HASH)
        except Exception:
            pass
        return None
    if not verify_password(password, user.password):
        return None
    return user

#routes
@auth_router.post("/login")
async def login_for_access_token(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_session)):
    user = await authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.name,
        user_id=user.id,
        expires_delta=access_token_expires
    )

    # refresh_token, jti, expires_at = create_refresh_token_payload(subject=user.username, user_id=user.id)
    # await crud.create_refresh_token_entry(db, user.user_id, jti, expires_at)

    # now = datetime.now(timezone.utc)
    # max_age = int((expires_at - now).total_seconds())

    # response.set_cookie(
    #     key="refresh_token",
    #     value=refresh_token,
    #     httponly=True,
    #     secure=False,   
    #     samesite="lax",
    #     max_age=max_age,
    #     path="/"
    # )

    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id}


@auth_router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    response: Response,
    user: schemas.UserCreate,
    db: AsyncSession = Depends(get_session),
):
    existing_user = await get_user_by_username(user.name,db )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь уже существует",
        )

    db_user = models.User(
        name=user.name,
        last_name = user.last_name,
        password=hash_password(user.password),
        email = user.email
    )

    db.add(db_user)
    await db.flush()  # чтобы получить db_user.id до commit

    access_token = create_access_token(subject=db_user.name, user_id=db_user.id)
    refresh_token, refresh_jti, refresh_exp = create_refresh_token_payload(
        subject=db_user.name,
        user_id=db_user.id,
    )

    refresh_record = models.RefreshToken(
        user_id=db_user.id,
        jti_hash=hash_jti(refresh_jti),
        created_at=datetime.now(timezone.utc),
        expires_at=refresh_exp,
        revoked=False,
        replaced_by=None,
    )

    db.add(refresh_record)
    await db.commit()

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "username": db_user.name,
        },
    }

@auth_router.post("/refresh")
async def refresh_token(
    response: Response,
    db: AsyncSession = Depends(get_session),
    refresh_token: Optional[str] = Cookie(None)
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token не передан",
        )
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Нужен refresh token",
        )
    old_jti = payload.get("jti")
    user_id = payload.get("user_id")
    if not old_jti or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный refresh token",
        )
    old_jti_hash = hash_jti(old_jti)
    token_row = await get_refresh_record_by_jti_hash(old_jti_hash,db )
    if not token_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token не найден",
        )
    if token_row.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token уже отозван",
        )
    if token_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token истёк",
        )
    user = await get_user_by_id( int(user_id),db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    new_access_token = create_access_token(subject=user.name, user_id=user.id)
    new_refresh_token, new_jti, new_exp = create_refresh_token_payload(
        subject=user.name,
        user_id=user.id,
    )
    #ротация
    token_row.revoked = True
    token_row.replaced_by = hash_jti(new_jti)
    new_refresh_row = models.RefreshToken(
        user_id=user.id,
        jti_hash=hash_jti(new_jti),
        created_at=datetime.now(timezone.utc),
        expires_at=new_exp,
        revoked=False,
        replaced_by=None,
    )

    db.add(new_refresh_row)
    await db.commit()

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
    }



@auth_router.post("/verify")
async def verify_current_user(current_user=Depends(get_current_user)):
    return {
        "ok": True,
        "user_id": current_user.id,
        "username": current_user.name,
    }