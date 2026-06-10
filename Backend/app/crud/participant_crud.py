from sqlalchemy.ext.asyncio import AsyncSession
import models, schemas
from sqlalchemy import select, func, cast, Float, insert, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, Depends, Form, File, UploadFile
from deps import get_session
from minio_api import upload_cover_to_minio, delete_book_from_minio, upload_book_to_minio
from typing import Optional


async def create_participant( 
    user_id:int,
    session_id:int,
    db:AsyncSession = Depends(get_session)
    ):
    user = await db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session = await db.get(models.Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db_participant = models.Session_Participant(user_id = user_id, session_id = session_id, role_id = 2)
    db.add(db_participant)
    try:
        await db.commit()
        await db.refresh(db_participant)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"{e}")
    return db_participant

async def join_participant( 
    user_id:int,
    session_id: int,
    db:AsyncSession = Depends(get_session)
    ):
    user = await db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session = await db.get(models.Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db_participant = models.Session_Participant(user_id = user_id, session_id = session_id, role_id = 1)
    db.add(db_participant)
    try:
        await db.commit()
        await db.refresh(db_participant)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"{e}")
    return db_participant

async def get_participant_by_user_session_id( 
    user_id:int,
    session_id: int,
    db:AsyncSession = Depends(get_session)
    ):
    if not session_id:
        raise HTTPException(status_code=404, detail="Session_id must be provided")
    q_find = select(models.Session_Participant).where(models.Session_Participant.session_id == session_id, models.Session_Participant.user_id == user_id)
    db_participant = (await db.execute(q_find)).scalar_one_or_none()
    if not db_participant:
        raise HTTPException(status_code=400, detail="You are going outer scope or you are not registered to this session")
    return db_participant