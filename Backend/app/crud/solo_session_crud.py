from sqlalchemy.ext.asyncio import AsyncSession
import models, schemas
from sqlalchemy import select, func, cast, Float, insert
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, Depends, Query
from deps import get_session
from passlib.context import CryptContext
import uuid

# Solo_Session
async def create_solo_session(user:models.User, book_id:int,db:AsyncSession = Depends(get_session)):
    user = await db.get(models.User, user.id)
    if not user:
        raise HTTPException(status_code=404, detail=f'user with id:{user.id} not found')
    book = await db.get(models.Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail=f'book with id:{book_id} not found')

    db_session = models.Solo_Session(        
        book_id = book_id,
        user_id= user.id
    )
    db.add(db_session)
    try:
        await db.commit()
        await db.refresh(db_session)
    except:
        await db.rollback()
        raise HTTPException(status_code=400, detail="failed to create session")
    return db_session

async def get_solo_session(
        user_id:int,
        book_id:int = Query(None),
        db:AsyncSession = Depends(get_session)):
    if user_id is not None and book_id is None:
        q = select(models.Solo_Session).where(models.Solo_Session.user_id == user_id)
        result = (await db.execute(q)).scalars().all()
        return result
    elif user_id is not None and book_id is not None:
        q = select(models.Solo_Session)\
            .options(selectinload(models.Solo_Session.book))\
            .where(
                models.Solo_Session.user_id == user_id,
                models.Solo_Session.book_id == book_id
            )
        result = (await db.execute(q)).scalar_one_or_none()
        return result
    
async def update_solo_session_note(
    user_id: int,
    note: schemas.SoloSessionNoteUpdate,
    db: AsyncSession
):
    # Проверяем, что заметка принадлежит пользователю
    db_note = await db.get(models.Solo_Note, note.id)
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    # Проверяем права доступа
    solo_session = await db.get(models.Solo_Session, db_note.solo_session_id)
    if not solo_session or solo_session.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if note.comment is not None:
        db_note.comment = note.comment
    if note.color is not None:
        db_note.color = note.color
    
    await db.commit()
    await db.refresh(db_note)
    
    return db_note
