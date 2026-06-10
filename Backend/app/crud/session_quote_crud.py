from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
import models, schemas
from sqlalchemy import select, func, cast, Float, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, Depends
from deps import get_session

async def create_session_quote(
        user_id:int,
        quote:schemas.SessionQuoteCreate,
        db:AsyncSession = Depends(get_session)):
    q_check = select(models.Session_Participant).where(models.Session_Participant.user_id == user_id, models.Session_Participant.session_id == quote.session_id)
    participant = (await db.execute(q_check)).scalar_one_or_none()
    if participant is None:
        raise HTTPException(status_code=403, detail="must be auth-d")

    db_quote = models.Session_Quote(
        **quote.model_dump(),
        participant_id = participant.id
    )
    db.add(db_quote)
    try:
        await db.commit()
        await db.refresh(db_quote)
    except HTTPException as e:
        raise HTTPException(status_code=400, detail=f'failed to create quote {e}')
    return db_quote

async def update_session_quote(
        user_id:int,
        quote: schemas.SessionQuoteUpdate, db: AsyncSession = Depends(get_session)):
    q_check = select(models.Session_Participant).where(models.Session_Participant.user_id == user_id, models.Session_Participant.session_id == quote.session_id)
    participant = (await db.execute(q_check)).scalar_one_or_none()
    if participant is None:
        raise HTTPException(status_code=403, detail="must be auth-d")


    update_data = quote.model_dump(exclude_unset=True, exclude={"id"})
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    stmt_select = select(models.Session_Quote).where(models.Session_Quote.id == quote.id)
    db_quote = (await db.execute(stmt_select)).scalars().first()

    if db_quote.participant_id != participant.id:
        raise HTTPException(status_code=403, detail="You are not allowed to update this quote")
    
    if not db_quote:
        raise HTTPException(status_code=404, detail=f"Quote with id={quote.id} not found")

    stmt_update = (
        update(models.Session_Quote)
        .where(models.Session_Quote.id == quote.id)
        .values(**update_data, participant_id = participant.id)
        .execution_options(synchronize_session="fetch")
    )
    
    try:
        await db.execute(stmt_update)
        await db.commit()        
        await db.refresh(db_quote)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update quote: {e}")
    
    return db_quote

async def delete_session_quote(
        user_id:int,
        quote: schemas.SessionQuoteDelete,  
        db: AsyncSession = Depends(get_session)
):
    q_check = select(models.Session_Participant).where(models.Session_Participant.user_id == user_id, models.Session_Participant.session_id == quote.session_id)
    participant = (await db.execute(q_check)).scalar_one_or_none()
    if participant is None:
        raise HTTPException(status_code=403, detail="must be auth-d")
    stmt_select = select(models.Session_Quote).where(models.Session_Quote.id == quote.id)
    db_quote = (await db.execute(stmt_select)).scalars().first()
    
    if not db_quote:
        raise HTTPException(status_code=404, detail=f"Quote with id={quote.id} not found")
        
    if db_quote.participant_id != participant.id:
        raise HTTPException(status_code=403, detail="You are not allowed to delete this quote")
    
    stmt_delete = delete(models.Session_Quote).where(models.Session_Quote.id == quote.id)
    
    try:
        await db.execute(stmt_delete)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete quote: {e}")
    
    return quote


async def get_session_quotes_by_session_id(session_id:int,db:AsyncSession = Depends(get_session)):
    q = select(models.Session_Quote).where(models.Session_Quote.session_id == session_id)
    result = (await db.execute(q)).scalars().all()
    return result

async def get_session_quotes_by_session_user_id(
        session_id:int,
        user_id:int,
        db:AsyncSession = Depends(get_session)):
    q_check = select(models.Session_Participant).where(models.Session_Participant.user_id == user_id, models.Session_Participant.session_id == session_id)
    participant = (await db.execute(q_check)).scalar_one_or_none()
    if participant is None:
        raise HTTPException(status_code=403, detail="must be auth-d")
    q = select(models.Session_Quote).where(models.Session_Quote.session_id == session_id).where(models.Session_Quote.participant_id == participant.id)
    result = (await db.execute(q)).scalars().all()
    return result