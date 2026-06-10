from sqlalchemy.ext.asyncio import AsyncSession
import models, schemas
from sqlalchemy import select, func, cast, Float, insert
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, Depends
from deps import get_session
from passlib.context import CryptContext
import uuid
from datetime import datetime
# Session

async def create_session(session:schemas.SessionCreate,user_id:int,db:AsyncSession = Depends(get_session)):
    user = await db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f'user with id:{user_id} not found')
    book = await db.get(models.Book, session.book_id)
    if not book:
        raise HTTPException(status_code=404, detail=f'book with id:{session.book_id} not found')

    db_session = models.Session(
        name=session.name,
        book_id = session.book_id,
        user_id= user_id,
        link=uuid.uuid4().hex 
    )
    db.add(db_session)
    try:
        await db.commit()
        await db.refresh(db_session)
    except:
        await db.rollback()
        raise HTTPException(status_code=400, detail="failed to create session")
    return db_session


async def get_participants_by_session_id(session_id:int,db:AsyncSession = Depends(get_session)):
    session = await db.get(models.Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session  not found")
    participants = session.participants 
    return participants


async def get_session_by_link(link:str,db:AsyncSession = Depends(get_session)):
    q = select(models.Session).where(models.Session.link == link)
    session = (await db.execute(q)).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session  not found")
    return session

def last_activity(session):
    notes_dates = [n.created_at for n in session.session_notes]
    quotes_dates = [q.created_at for q in session.session_quotes]
    all_dates = notes_dates + quotes_dates
    return max(all_dates) if all_dates else datetime.datetime(1970,1,1)


async def get_notifications_by_user_id(offset:int, limit:int, user_id:int,db:AsyncSession = Depends(get_session)):
    result = (
        await db.execute(
            select(models.Session)
            .join(models.Session.participants)
            .options(
                selectinload(models.Session.session_notes)
                    .selectinload(models.Session_Note.answers),
                selectinload(models.Session.session_quotes),
            )
            .where(models.Session.participants.any(user_id=user_id))
            .distinct()
        )
    ).scalars().all()
    result = sorted(result, key=last_activity, reverse=True)
    paged = result[offset:offset + limit]
    return paged


async def get_sessions_by_user_id(user_id:int,db:AsyncSession = Depends(get_session)):
    result = (await db.execute(select(models.Session_Participant).options(selectinload(models.Session_Participant.session)).join(models.Session_Participant.session).where(models.Session_Participant.user_id==user_id))                         
        ).scalars().all()
    return result