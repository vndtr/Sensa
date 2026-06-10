from fastapi import APIRouter, Depends, File, Request, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.exceptions import HTTPException
import crud
import schemas, models
from deps import get_session
from .auth_router import get_current_user

solo_session_note_router = APIRouter(prefix="/solo_session/note", tags=["solo_session_note"] )

@solo_session_note_router.get('/{solo_session_id}')
async def get_session_notes(
        request:Request,
        solo_session_id:int,
        db:AsyncSession = Depends(get_session)):
    if solo_session_id is None:
        raise HTTPException(
            status_code=422,
            detail=[
                {
                    "loc": ["solo_session_id"],
                    "msg": "solo_session_id must be provided",
                    "type": "value_error.missing"
                }
            ]
        )
    else:
        return await crud.get_solo_session_notes_by_solo_session_id(request.state.user.id,solo_session_id, db)

@solo_session_note_router.post('/')
async def add_session_note(
    solo_session_note:schemas.SoloSessionNoteCreate,
    request:Request,
    db:AsyncSession = Depends(get_session)):
    return await crud.create_solo_session_note(request.state.user.id, solo_session_note, db)

@solo_session_note_router.patch('/')
async def update_session_note(
    solo_session_note:schemas.SoloSessionNoteUpdate,
    request:Request,
    db:AsyncSession = Depends(get_session)):
    return await crud.update_solo_session_note(request.state.user.id, solo_session_note, db)

@solo_session_note_router.delete('/')
async def delete_session_note(
    solo_session_note:schemas.SoloSessionNoteDelete,
    request:Request,
    db:AsyncSession = Depends(get_session)):
    return await crud.delete_solo_session_note(request.state.user.id, solo_session_note, db)



  