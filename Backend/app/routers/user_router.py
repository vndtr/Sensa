from fastapi import APIRouter, Depends, File, UploadFile, Form, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import crud, schemas, models
from deps import get_session
from .auth_router import get_current_user

user_router = APIRouter(prefix="/user", tags=["user"])

@user_router.post('/', response_model=schemas.UserCreate)
async def add_user(user:schemas.UserCreate,db:AsyncSession = Depends(get_session)):
    return await crud.create_user(user, db)

@user_router.patch('/', response_model=schemas.UserUpdate)
async def update_user(
    request:Request,
    user:schemas.UserUpdate,db:AsyncSession = Depends(get_session)):
    return await crud.update_user(request.state.user.id, user, db)

@user_router.get('/profile', response_model=schemas.UserRead)
async def get_profile(request:Request,db:AsyncSession = Depends(get_session)):
    q = select(models.User).where(models.User.id == request.state.user.id)
    db_user = (await db.execute(q)).scalar_one_or_none()
    return db_user