from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
import models, schemas
from sqlalchemy import func, cast, Float, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException, Depends
from deps import get_session
# solosession note 

async def get_solo_session_notes_by_solo_session_id(
        user_id:int,
        solo_session_id:int,db:AsyncSession = Depends(get_session)):
    q_check = select(models.Solo_Session.id).where(
        models.Solo_Session.id == solo_session_id,
        models.Solo_Session.user_id == user_id
    )
    db_check = (await db.execute(q_check)).scalar_one_or_none()
    if db_check is None:
        raise HTTPException(status_code=403, detail="must be auth-d")
    
    q = select(models.Solo_Note).where(models.Solo_Note.solo_session_id == solo_session_id)
    result = (await db.execute(q)).scalars().all()
    return result

async def create_solo_session_note(
        user_id:int,
        note:schemas.SoloSessionNoteCreate,
        db:AsyncSession = Depends(get_session)):
    q_check = select(models.Solo_Session.id).where(
        models.Solo_Session.id == note.solo_session_id,
        models.Solo_Session.user_id == user_id
    )
    db_check = (await db.execute(q_check)).scalar_one_or_none()
    if db_check is None:
        raise HTTPException(status_code=403, detail="must be auth-d")

    db_note = models.Solo_Note(
        **note.model_dump()
    )
    db.add(db_note)
    try:
        await db.commit()
        await db.refresh(db_note)
    except HTTPException as e:
        raise HTTPException(status_code=400, detail=f'failed to create note {e}')
    return db_note


async def update_solo_session_note(
    user_id: int,
    note: schemas.SoloSessionNoteUpdate,
    db: AsyncSession = Depends(get_session)
):
    db_note = await db.get(models.Solo_Note, note.id)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    q_check = select(models.Solo_Session.id).where(
        models.Solo_Session.id == note.solo_session_id,
        models.Solo_Session.user_id == user_id
    )
    db_check = (await db.execute(q_check)).scalar_one_or_none()
    if db_check is None:
        raise HTTPException(status_code=403, detail="Forbidden access")

    update_data = {k: v for k, v in note.model_dump(exclude_unset=True, exclude={"id"}).items() if v is not None}
    if not update_data:
        return db_note
    update_stmt = (
        update(models.Solo_Note)
        .where(models.Solo_Note.id == note.id)
        .values(**update_data)
        .execution_options(synchronize_session="fetch")
    )

    try:
        await db.execute(update_stmt)
        await db.commit()
        db_note = await db.get(models.Solo_Note, note.id)
        return db_note
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update note: {e}")


async def delete_solo_session_note(
        user_id:int,
        note:schemas.SoloSessionNoteUpdate,
        db:AsyncSession = Depends(get_session)):
    q_check = select(models.Solo_Session.id).where(
        models.Solo_Session.id == note.solo_session_id,
        models.Solo_Session.user_id == user_id
    )
    db_check = (await db.execute(q_check)).scalar_one_or_none()
    if db_check is None:
        raise HTTPException(status_code=403, detail="must be auth-d")
    db_note = (await db.execute(select(models.Solo_Note).where(models.Solo_Note.id == note.id))).scalar_one_or_none()
    if db_note is None:
        raise HTTPException(status_code=404, detail="solo note not found")
    delete_stmt = delete(models.Solo_Note).where(models.Solo_Note.id == note.id)
    try:
        (await db.execute(delete_stmt))
        await db.commit()
    except HTTPException as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f'failed to delete note {e}')
    return {"message":"deleted successfully"}

