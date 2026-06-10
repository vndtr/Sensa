from fastapi import APIRouter, Depends, Request, Query
from fastapi.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import crud
import models
import schemas
from deps import get_session
from websocket_manager import manager

session_note_router = APIRouter(prefix="/session/note", tags=["session_note"])

@session_note_router.post('/create')
async def add_session_note(
    session_note: schemas.SessionNoteCreate,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    result = await crud.create_session_note(request.state.user.id, session_note, db)
    # Отправляем вебсокет только для публичных заметок
    if not session_note.is_private:
        await manager.broadcast(
            session_id=session_note.session_id,
            message={
                "type": "note_created",
                "note_id": result.id,
                "session_id": session_note.session_id,
                "action": "reload"
            }
        )
    return result

@session_note_router.post('/update')
async def update_session_note(
    session_note: schemas.SessionNoteUpdate,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    result = await crud.update_session_note(request.state.user.id, session_note, db)
    # Получаем оригинальную заметку чтобы узнать, публичная она или нет
    from sqlalchemy import select
    stmt = select(models.Session_Note).where(models.Session_Note.id == session_note.id)
    db_note = (await db.execute(stmt)).scalar_one_or_none()
    
    if db_note and not db_note.is_private:
        await manager.broadcast(
            session_id=session_note.session_id,
            message={
                "type": "note_updated",
                "note_id": session_note.id,
                "session_id": session_note.session_id,
                "action": "reload"
            }
        ) 
    return result

@session_note_router.post('/delete')
async def delete_session_note(
    session_note: schemas.SessionNoteDelete,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    # Получаем заметку перед удалением
    from sqlalchemy import select
    stmt = select(models.Session_Note).where(models.Session_Note.id == session_note.id)
    db_note = (await db.execute(stmt)).scalar_one_or_none()
    is_public = db_note and not db_note.is_private if db_note else False
    result = await crud.delete_session_note(request.state.user.id, session_note, db)
    
    if is_public:
        await manager.broadcast(
            session_id=session_note.session_id,
            message={
                "type": "note_deleted",
                "note_id": session_note.id,
                "session_id": session_note.session_id,
                "action": "reload"
            }
        )
    return result

@session_note_router.get('/')
async def get_session_notes(
    request: Request,
    session_id: int = Query(...),
    db: AsyncSession = Depends(get_session)
):
    if session_id is None:
        raise HTTPException(status_code=422, detail="session_id must be provided")
    
    my_notes, public_notes = await crud.get_session_notes_by_session_user_id(
        request.state.user.id, session_id, db
    ) 
    result = []
    seen_ids = set()
    
    for note in my_notes:
        participant = await db.get(models.Session_Participant, note.participant_id)
        if participant:
            user = await db.get(models.User, participant.user_id)
            result.append({
                "id": note.id,
                "selected_text": note.selected_text,
                "color": note.color,
                "is_private": note.is_private,
                "comment": note.comment,
                "start_index": note.start_index,
                "end_index": note.end_index,
                "author_id": participant.user_id,
                "author_name": user.name if user else "Пользователь",
                "author_role": "teacher" if participant.role_id == 2 else "student",
                "created_at": str(note.created_at) if hasattr(note, 'created_at') else None
            })
            seen_ids.add(note.id)
    for note in public_notes:
        if note.id in seen_ids:
            continue
        participant = await db.get(models.Session_Participant, note.participant_id)
        if participant:
            user = await db.get(models.User, participant.user_id)
            result.append({
                "id": note.id,
                "selected_text": note.selected_text,
                "color": note.color,
                "is_private": note.is_private,
                "comment": note.comment,
                "start_index": note.start_index,
                "end_index": note.end_index,
                "author_id": participant.user_id,
                "author_name": user.name if user else "Пользователь",
                "author_role": "teacher" if participant.role_id == 2 else "student",
                "created_at": str(note.created_at) if hasattr(note, 'created_at') else None
            }) 
    return result