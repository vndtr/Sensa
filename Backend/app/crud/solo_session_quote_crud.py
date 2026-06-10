# app/crud.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
import models, schemas
from sqlalchemy import select, func, cast, Float, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, Depends
from deps import get_session
# solosession quote 

async def get_solo_session_quotes_by_solo_session_id(
        user_id:int,
        solo_session_id:int,
        db:AsyncSession = Depends(get_session)):
    q_check = select(models.Solo_Session.id).where(
        models.Solo_Session.id == solo_session_id,
        models.Solo_Session.user_id == user_id
    )
    db_check = (await db.execute(q_check)).scalar_one_or_none()
    if db_check is None:
        raise HTTPException(status_code=403, detail="must be auth-d")
    q = select(models.Solo_Quote).where(models.Solo_Quote.solo_session_id == solo_session_id)
    result = (await db.execute(q)).scalars().all()
    return result

async def create_solo_session_quote(
        user_id:int,
        quote:schemas.SoloSessionQuoteCreate,
        db:AsyncSession = Depends(get_session)):
    
    q_check = select(models.Solo_Session.id).where(
        models.Solo_Session.id == quote.solo_session_id,
        models.Solo_Session.user_id == user_id
    )
    db_check = (await db.execute(q_check)).scalar_one_or_none()
    if db_check is None:
        raise HTTPException(status_code=403, detail="must be auth-d")

    db_quote = models.Solo_Quote(
        **quote.model_dump()
    )
    db.add(db_quote)
    try:
        await db.commit()
        await db.refresh(db_quote)
    except HTTPException as e:
        raise HTTPException(status_code=400, detail=f'failed to create quote {e}')
    return db_quote

async def update_solo_session_quote(
        user_id:int,
        note:schemas.SoloQuoteUpdate,
        db:AsyncSession = Depends(get_session)):
    quote = await db.get(models.Solo_Quote, note.id)
    if quote is None:
        raise HTTPException(status_code=404, detail="Quote not found")
    q_check = select(models.Solo_Session.id).where(
        models.Solo_Session.id == note.solo_session_id,
        models.Solo_Session.user_id == user_id
    )
    db_check = (await db.execute(q_check)).scalar_one_or_none()
    if db_check is None:
        raise HTTPException(status_code=403, detail="must be auth-d")
    update_data = {k: v for k, v in note.model_dump(exclude_unset=True, exclude={"id"}).items() if v is not None}
    if not update_data:
        return quote
    update_stmt = update(models.Solo_Quote).where(models.Solo_Quote.id == note.id).values(**update_data).execution_options(synchronize_session="fetch")
    try:
        await db.execute(update_stmt)
        await db.commit()
        db_quote = await db.get(models.Solo_Quote, note.id)
        return db_quote
    except HTTPException as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f'failed to create note {e}')


async def delete_solo_session_quote(
        user_id:int,
        note:schemas.SoloQuoteDelete,
        db:AsyncSession = Depends(get_session)):
    q_check = select(models.Solo_Session.id).where(
        models.Solo_Session.id == note.solo_session_id,
        models.Solo_Session.user_id == user_id
    )
    db_check = (await db.execute(q_check)).scalar_one_or_none()
    if db_check is None:
        raise HTTPException(status_code=403, detail="must be auth-d")
    db_note = (await db.execute(select(models.Solo_Quote).where(models.Solo_Quote.id == note.id))).scalar_one_or_none()
    if db_note is None:
        raise HTTPException(status_code=404, detail="solo not not found")
    delete_stmt = delete(models.Solo_Quote).where(models.Solo_Quote.id == note.id)
    try:
        (await db.execute(delete_stmt))
        await db.commit()
    except HTTPException as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f'failed to delete note {e}')
    return {"message":"deleted successfully"}