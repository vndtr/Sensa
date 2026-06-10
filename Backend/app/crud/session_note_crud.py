from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete,  func, cast, Float, insert
import models, schemas
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, Depends
from deps import get_session
# session note notes

async def create_session_note(user_id:int, note:schemas.SessionNoteCreate,db:AsyncSession = Depends(get_session)):
    q_check = select(models.Session_Participant).where(models.Session_Participant.user_id == user_id, models.Session_Participant.session_id == note.session_id)
    participant = (await db.execute(q_check)).scalar_one_or_none()
    if participant is None:
        raise HTTPException(status_code=403, detail="must be auth-d")
    
    db_note = models.Session_Note(
        **note.model_dump(),
        participant_id = participant.id
    )
    db.add(db_note)
    try:
        await db.commit()
        await db.refresh(db_note)
    except HTTPException as e:
        raise HTTPException(status_code=400, detail=f'failed to create note {e}')
    return db_note

async def update_session_note(user_id:int, note: schemas.SessionNoteUpdate, db: AsyncSession = Depends(get_session)):
    q_check = select(models.Session_Participant).where(models.Session_Participant.user_id == user_id, models.Session_Participant.session_id == note.session_id)
    participant = (await db.execute(q_check)).scalar_one_or_none()
    if participant is None:
        raise HTTPException(status_code=403, detail="must be auth-d")
    
    update_data = note.model_dump(exclude_unset=True, exclude={"id"})
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    stmt_select = select(models.Session_Note).where(models.Session_Note.id == note.id)
    db_note = (await db.execute(stmt_select)).scalars().first()

    if db_note.participant_id != participant.id:
        raise HTTPException(status_code=403, detail="You are not allowed to update this note")
    
    if not db_note:
        raise HTTPException(status_code=404, detail=f"Note with id={note.id} not found")

    stmt_update = (
        update(models.Session_Note)
        .where(models.Session_Note.id == note.id)
        .values(**update_data, participant_id = participant.id)
        .execution_options(synchronize_session="fetch")
    )
    
    try:
        await db.execute(stmt_update)
        await db.commit()        
        await db.refresh(db_note)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update note: {e}")
    
    return db_note

async def delete_session_note(
    user_id: int,
    note: schemas.SessionNoteDelete,
    db: AsyncSession = Depends(get_session)
):
    # Проверяем участника
    q_check = select(models.Session_Participant).where(
        models.Session_Participant.user_id == user_id,
        models.Session_Participant.session_id == note.session_id
    )
    participant = (await db.execute(q_check)).scalar_one_or_none()
    
    if participant is None:
        raise HTTPException(status_code=403, detail="Must be authenticated")
    
    # Находим заметку
    stmt_select = select(models.Session_Note).where(models.Session_Note.id == note.id)
    db_note = (await db.execute(stmt_select)).scalar_one_or_none()
    
    if not db_note:
        raise HTTPException(status_code=404, detail=f"Note with id={note.id} not found")
    
    # Проверяем права
    if db_note.participant_id != participant.id:
        raise HTTPException(status_code=403, detail="You are not allowed to delete this note")
    
    # Удаляем заметку 
    await db.delete(db_note)
    
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete note: {e}")
    
    return note


async def get_session_notes_by_session_id(
        user_id:int,
        session_id:int,db:AsyncSession = Depends(get_session)):
    q_check = select(models.Session_Participant).where(models.Session_Participant.user_id == user_id, models.Session_Participant.session_id == session_id)
    check_result = (await db.execute(q_check)).scalar_one_or_none()
    if check_result is None:
        raise HTTPException(status_code=403, detail="must be auth-d")
    q = select(models.Session_Note).where(models.Session_Note.session_id == session_id)
    
    result = (await db.execute(q)).scalars().all()
    return result


async def get_session_notes_by_session_user_id(
        user_id:int,
        session_id:int, db:AsyncSession = Depends(get_session)):
    q_check = select(models.Session_Participant).where(models.Session_Participant.user_id == user_id, models.Session_Participant.session_id == session_id)
    participant = (await db.execute(q_check)).scalar_one_or_none()
    if participant is None:
        raise HTTPException(status_code=403, detail="must be auth-d")
    

    q = select(models.Session_Note).where(models.Session_Note.session_id == session_id).where(models.Session_Note.participant_id == participant.id)
    result = (await db.execute(q)).scalars().all()
    q = select(models.Session_Note).where(models.Session_Note.session_id == session_id).where(models.Session_Note.is_private == False)
    result2 = (await db.execute(q)).scalars().all()
    return result, result2