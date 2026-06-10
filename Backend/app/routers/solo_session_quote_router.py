from fastapi import APIRouter, Depends, File, Request, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.exceptions import HTTPException
import crud
import schemas, models
from deps import get_session
from .auth_router import get_current_user

solo_session_quote_router = APIRouter(prefix="/solo_session/quote", tags=["solo_session_quote"])

@solo_session_quote_router.get('/{solo_session_id}')
async def get_session_quotes(
        request:Request,
        solo_session_id:int,
        db:AsyncSession = Depends(get_session)):
    if solo_session_id is None:
        raise HTTPException(status_code=422,detail="solo_session_id must be provided")
    else:
        return await crud.get_solo_session_quotes_by_solo_session_id(request.state.user.id, solo_session_id, db)

@solo_session_quote_router.post('/')
async def add_session_quote(
    solo_session_quote:schemas.SoloSessionQuoteCreate,
    request:Request,
    db:AsyncSession = Depends(get_session)):
    return await crud.create_solo_session_quote(request.state.user.id, solo_session_quote, db)

@solo_session_quote_router.patch('/')
async def update_session_quote(
    solo_session_note:schemas.SoloQuoteUpdate,
    request:Request,
    db:AsyncSession = Depends(get_session)):
    return await crud.update_solo_session_quote(request.state.user.id, solo_session_note, db)


@solo_session_quote_router.delete('/')
async def delete_session_quote(
    solo_session_note:schemas.SoloQuoteDelete,
    request:Request,
    db:AsyncSession = Depends(get_session)):
    return await crud.delete_solo_session_quote(request.state.user.id, solo_session_note, db)