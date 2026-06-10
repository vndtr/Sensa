from fastapi import APIRouter, Depends, Request, Query
from fastapi.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import crud
import schemas
import models
from deps import get_session
from websocket_manager import manager, notification_connections

answer_router = APIRouter(prefix="/answer", tags=["answer"])

@answer_router.post('/create')
async def add_session_answer(
    answer: schemas.AnswerCreate,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    user = request.state.user
    result = await crud.create_answer(answer, user.id, db)
    
    await manager.broadcast(
        session_id=answer.session_id,
        message={
            "type": "answer_created",
            "answer_id": result.id,
            "note_id": answer.note_id,
            "session_id": answer.session_id,
            "action": "reload"
        }
    )
    # получаем автора заметки
    stmt_note = select(models.Session_Note).where(models.Session_Note.id == answer.note_id)
    note = (await db.execute(stmt_note)).scalar_one_or_none()
    
    if note:
        stmt_participant = select(models.Session_Participant).where(
            models.Session_Participant.id == note.participant_id
        )
        note_author = (await db.execute(stmt_participant)).scalar_one_or_none()
        if note_author and note_author.user_id != user.id:
            stmt_answer_participant = select(models.Session_Participant).where(
                models.Session_Participant.id == result.participant_id
            )
            answer_participant = (await db.execute(stmt_answer_participant)).scalar_one_or_none()
            if answer_participant:
                stmt_user = select(models.User).where(models.User.id == answer_participant.user_id)
                answer_user = (await db.execute(stmt_user)).scalar_one_or_none()
                if note_author.user_id in notification_connections:
                    for conn in notification_connections[note_author.user_id]:
                        try:
                            await conn.send_json({
                                "type": "new_answer",
                                "answer_id": result.id,
                                "note_id": answer.note_id,
                                "session_id": answer.session_id,
                                "author_name": answer_user.name if answer_user else "Пользователь",
                                "answer_text": answer.content[:100],
                                "created_at": result.created_at.isoformat() if hasattr(result, 'created_at') else None
                            })
                        except Exception as e:
                            print(f"Failed to send notification: {e}")
    return result

@answer_router.get('/')
async def get_session_answers(
    note_id: int,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    user = request.state.user
    stmt_note = select(models.Session_Note).where(models.Session_Note.id == note_id)
    note = (await db.execute(stmt_note)).scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    stmt_participant = select(models.Session_Participant).where(
        models.Session_Participant.user_id == user.id,
        models.Session_Participant.session_id == note.session_id
    )
    current_participant = (await db.execute(stmt_participant)).scalar_one_or_none()
    
    if not current_participant:
        raise HTTPException(status_code=403, detail="Access denied")
    
    current_role = "teacher" if current_participant.role_id == 2 else "student"
    stmt_answers = select(models.Answer).where(models.Answer.note_id == note_id)
    answers = (await db.execute(stmt_answers)).scalars().all()
    
    result = []
    for answer in answers:
        stmt_answer_participant = select(models.Session_Participant).where(
            models.Session_Participant.id == answer.participant_id
        )
        answer_participant = (await db.execute(stmt_answer_participant)).scalar_one_or_none()
        if not answer_participant:
            continue
        stmt_user = select(models.User).where(models.User.id == answer_participant.user_id)
        answer_user = (await db.execute(stmt_user)).scalar_one_or_none() 
        answer_role = "teacher" if answer_participant.role_id == 2 else "student"
        
        if current_role == "teacher":
            show_answer = True
        else:
            is_own_answer = answer_participant.user_id == user.id
            is_teacher_answer = answer_role == "teacher"
            show_answer = is_own_answer or is_teacher_answer
        
        if show_answer:
            result.append({
                "id": answer.id,
                "content": answer.content,
                "note_id": answer.note_id,
                "participant_id": answer.participant_id,
                "created_at": answer.created_at.isoformat() if answer.created_at else None,
                "author": {
                    "id": answer_user.id if answer_user else None,
                    "name": f"{answer_user.name} {answer_user.last_name}".strip() if answer_user else "Unknown",
                    "role": answer_role
                }
            }) 
    return result

@answer_router.patch('/update')
async def update_session_answer(
    answer: schemas.AnswerUpdate,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    user = request.state.user
    result = await crud.update_session_answer(answer, user.id, db)
    await manager.broadcast(
        session_id=answer.session_id,
        message={
            "type": "answer_updated",
            "answer_id": answer.id,
            "note_id": answer.note_id,
            "session_id": answer.session_id,
            "action": "reload"
        }
    )
    return result

@answer_router.post('/delete')
async def delete_session_answer(
    answer: schemas.AnswerDelete,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    user = request.state.user
    result = await crud.delete_session_answer(answer, user.id, db)
    await manager.broadcast(
        session_id=answer.session_id,
        message={
            "type": "answer_deleted",
            "answer_id": answer.id,
            "note_id": answer.note_id,
            "session_id": answer.session_id,
            "action": "reload"
        }
    )
    return result

@answer_router.get('/recent')
async def get_recent_answers(
    request: Request,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_session)
):
    user = request.state.user
    stmt_participant = select(models.Session_Participant).where(
        models.Session_Participant.user_id == user.id
    )
    participants = (await db.execute(stmt_participant)).scalars().all()
    session_ids = [p.session_id for p in participants]
    
    if not session_ids:
        return []
    
    stmt_notes = select(models.Session_Note).where(
        models.Session_Note.session_id.in_(session_ids)
    )
    notes = (await db.execute(stmt_notes)).scalars().all()
    note_ids = [note.id for note in notes]
    
    if not note_ids:
        return []
    
    stmt_answers = select(models.Answer).where(
        models.Answer.note_id.in_(note_ids)
    ).order_by(models.Answer.created_at.desc()).limit(limit)
    
    answers = (await db.execute(stmt_answers)).scalars().all()
    
    result = []
    for answer in answers:
        stmt_answer_participant = select(models.Session_Participant).where(
            models.Session_Participant.id == answer.participant_id
        )
        answer_participant = (await db.execute(stmt_answer_participant)).scalar_one_or_none()
        if answer_participant and answer_participant.user_id != user.id:
            stmt_user = select(models.User).where(models.User.id == answer_participant.user_id)
            answer_user = (await db.execute(stmt_user)).scalar_one_or_none()
            if answer_user:
                result.append({
                    "id": answer.id,
                    "note_id": answer.note_id,
                    "message": f"{answer_user.name} ответил на вашу заметку",
                    "session_id": answer_participant.session_id,
                    "answer_text": answer.content[:100],
                    "created_at": answer.created_at.isoformat()
                })
    return result