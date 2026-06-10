from fastapi import APIRouter, Depends, File, Request, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import crud
import schemas, models
from deps import get_session
from .auth_router import get_current_user
from websocket_manager import manager

session_router = APIRouter(prefix="/session", tags=["session"])

@session_router.post('/')
async def add_session(
        session:schemas.SessionCreate,
        request:Request,
        db:AsyncSession = Depends(get_session)):
    db_session = await crud.create_session(session,request.state.user.id, db)
    await crud.create_participant(request.state.user.id, db_session.id, db)

    return db_session

@session_router.get('/{session_id}')
async def get_session_participants(
        session_id:int,
        request:Request,
        db:AsyncSession = Depends(get_session)):
    participants = await crud.get_participants_by_session_id(session_id, db)
    result = []
    for p in participants:
        user = await db.get(models.User, p.user_id)
        result.append({
            "id": p.id,
            "session_id": p.session_id,
            "user_id": p.user_id,
            "role_id": p.role_id,
            "user": {
                "id": user.id,
                "name": user.name,
                "last_name": user.last_name,
                "email": user.email
            } if user else None
        })
    return result

@session_router.get('/')
async def get_sessions(
        request:Request,
        db:AsyncSession = Depends(get_session)):
    participants = await crud.get_sessions_by_user_id(request.state.user.id, db)

    return participants

@session_router.post('/notifications')
async def get_session_participants(
        session_notify:schemas.SessionNotifications,
        requst:Request,
        db:AsyncSession = Depends(get_session)):
    result = await crud.get_notifications_by_user_id(offset=session_notify.offset, limit=session_notify.limit, user_id=requst.state.user.id, db=db)

    return result

@session_router.post('/{link}', summary="Переход по ссылке добавляет участника в сессию")
async def join_by_link(
        link:str,
        request:Request,
        session_id:int,
        db:AsyncSession = Depends(get_session)):
    session = await crud.get_session_by_link(link, db)
    await crud.join_participant(request.state.user.id, session_id, db=db)

    return session

@session_router.get('/info/{session_id}')
async def get_session_info(
    session_id: int,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    session = await db.get(models.Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "id": session.id,
        "name": session.name,
        "book_id": session.book_id,
        "is_active": session.is_active,
        "link": session.link
    }

@session_router.put('/{session_id}/users/{user_id}')
async def update_participant_role(
    session_id: int,
    user_id: int,
    request: Request,
    role_data: dict,
    db: AsyncSession = Depends(get_session)
):
    # Проверяем, что текущий пользователь - учитель в этой сессии
    current_user = request.state.user
    
    stmt_current = select(models.Session_Participant).where(
        models.Session_Participant.user_id == current_user.id,
        models.Session_Participant.session_id == session_id
    )
    current_participant = (await db.execute(stmt_current)).scalar_one_or_none()
    
    if not current_participant or current_participant.role_id != 2:
        raise HTTPException(status_code=403, detail="Only teacher can change roles")
    
    stmt_target = select(models.Session_Participant).where(
        models.Session_Participant.user_id == user_id,
        models.Session_Participant.session_id == session_id
    )
    target_participant = (await db.execute(stmt_target)).scalar_one_or_none()
    
    if not target_participant:
        raise HTTPException(status_code=404, detail="User not found in this session")
    
    # Нельзя менять роль создателя сессии 
    stmt_session = select(models.Session).where(models.Session.id == session_id)
    session = (await db.execute(stmt_session)).scalar_one_or_none()
    
    if session and session.user_id == user_id:
        raise HTTPException(status_code=403, detail="Cannot change creator's role")
    
    target_participant.role_id = role_data.get('role_id', 1)
    
    try:
        await db.commit()
        await db.refresh(target_participant)
        # Отправляем вебсокет уведомление всем участникам сессии
        await manager.broadcast(
            session_id=session_id,
            message={
                "type": "role_changed",
                "user_id": user_id,
                "new_role_id": target_participant.role_id,
                "action": "reload"
            }
        )    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update role: {e}")
    
    return {"message": "Role updated successfully"}

@session_router.post('/{session_id}/progress')
async def update_session_progress(
    session_id: int,
    request: Request,
    progress_data: dict,
    db: AsyncSession = Depends(get_session)
):
    user = request.state.user 
    stmt = select(models.Session_Participant).where(
        models.Session_Participant.user_id == user.id,
        models.Session_Participant.session_id == session_id
    )
    participant = (await db.execute(stmt)).scalar_one_or_none()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")
    
    participant.last_page = progress_data.get('last_page', 0)
    await db.commit()
    
    return {"message": "Progress updated"}

@session_router.get('/{session_id}/progress')
async def get_session_progress(
    session_id: int,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    user = request.state.user
    
    stmt = select(models.Session_Participant).where(
        models.Session_Participant.user_id == user.id,
        models.Session_Participant.session_id == session_id
    )
    participant = (await db.execute(stmt)).scalar_one_or_none()
    
    if not participant:
        return {"last_page": 0}
    
    return {"last_page": participant.last_page or 0}

@session_router.post('/{session_id}/leave')
async def leave_session(
    session_id: int,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    user = request.state.user
    print(f"User {user.id} trying to leave session {session_id}")

    stmt = select(models.Session_Participant).where(
        models.Session_Participant.user_id == user.id,
        models.Session_Participant.session_id == session_id
    )
    participant = (await db.execute(stmt)).scalar_one_or_none()
    
    if not participant:
        raise HTTPException(status_code=404, detail="You are not a participant of this session")
    
    stmt_session = select(models.Session).where(models.Session.id == session_id)
    session = (await db.execute(stmt_session)).scalar_one_or_none()
    
    is_creator = (session and session.user_id == user.id)
    print(f"Is creator: {is_creator}")
    
    if is_creator:
        # Создатель - удаляем всю сессию (каскадно удалится всё)
        await db.delete(session)
        await db.commit()
        
        # Отправляем вебсокет уведомление
        await manager.broadcast(
            session_id=session_id,
            message={
                "type": "session_deleted",
                "session_id": session_id,
                "action": "redirect"
            }
        )
        
        return {"message": "Session deleted", "is_creator": True}
    else:
        # Обычный участник - удаляем сначала всё, что связано с ним
        # Удаляем ответы участника
        stmt_answers = delete(models.Answer).where(models.Answer.participant_id == participant.id)
        await db.execute(stmt_answers)
        # Удаляем цитаты участника
        stmt_quotes = delete(models.Session_Quote).where(models.Session_Quote.participant_id == participant.id)
        await db.execute(stmt_quotes)
        # Удаляем заметки участника
        stmt_notes = delete(models.Session_Note).where(models.Session_Note.participant_id == participant.id)
        await db.execute(stmt_notes)
        # Удаляем самого участника
        await db.delete(participant)
        await db.commit()
        
        await manager.broadcast(
            session_id=session_id,
            message={
                "type": "participant_left",
                "user_id": user.id,
                "user_name": user.name,
                "action": "reload"
            }
        )
        
        return {"message": "You left the session", "is_creator": False}