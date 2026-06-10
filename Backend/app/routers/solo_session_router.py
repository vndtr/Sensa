from fastapi import APIRouter, Depends, File, Request, Form, Query
from fastapi.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import crud
import schemas, models
from deps import get_session
from .auth_router import get_current_user

solo_session_router = APIRouter(prefix="/solo_session", tags=["solo_session"])

@solo_session_router.post('/create')
async def create_solo_session(
    request:Request,
    book_id:int = Query(...),
    db:AsyncSession = Depends(get_session)):
    return await crud.create_solo_session(request.state.user,book_id, db)

@solo_session_router.get('/')
async def get_solo_session(
        request:Request,
        book_id:int = Query(None),
        db:AsyncSession = Depends(get_session)):
    return await crud.get_solo_session(request.state.user.id,book_id, db)
    
@solo_session_router.get('/last')
async def get_last_solo_session(
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    user = request.state.user
    
    stmt = select(models.Solo_Session).where(
        models.Solo_Session.user_id == user.id
    ).order_by(models.Solo_Session.id.desc()).limit(1)
    
    session = (await db.execute(stmt)).scalar_one_or_none()
    
    if not session:
        return None
    
    return {
        "id": session.id,
        "book_id": session.book_id,
        "last_position": session.last_position or 0
    }

@solo_session_router.post('/{solo_session_id}/progress')
async def update_solo_progress(
    solo_session_id: int,
    request: Request,
    progress_data: dict,
    db: AsyncSession = Depends(get_session)
):
    user = request.state.user
    
    stmt = select(models.Solo_Session).where(
        models.Solo_Session.id == solo_session_id,
        models.Solo_Session.user_id == user.id
    )
    session = (await db.execute(stmt)).scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.last_position = progress_data.get('last_page', 0)
    await db.commit()
    
    return {"message": "Progress updated"}

@solo_session_router.get('/{solo_session_id}/progress')
async def get_solo_progress(
    solo_session_id: int,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    user = request.state.user
    stmt = select(models.Solo_Session).where(
        models.Solo_Session.id == solo_session_id,
        models.Solo_Session.user_id == user.id
    )
    session = (await db.execute(stmt)).scalar_one_or_none() 
    if not session:
        return {"last_page": 0}
    
    return {"last_page": session.last_position or 0}