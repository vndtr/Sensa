from fastapi import APIRouter, Depends, File, UploadFile, Form, Request, Query
from fastapi.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import crud, models
import schemas
from deps import get_session
from .auth_router import get_current_user
from typing import Optional

book_router = APIRouter(prefix="/book", tags=["book"])

@book_router.post('/')
async def add_book(
    request: Request,
    title: str = Form(...),
    author: str = Form(...),
    book_cover: UploadFile = File(...),
    content: UploadFile = File(...),
    db: AsyncSession = Depends(get_session)
):
    return await crud.create_book(title, author, request.state.user.id, book_cover, content, db)

@book_router.get('/{book_id}', response_model=schemas.BookRead)
async def get_book(
    book_id: int,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    book = await db.get(models.Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found") 
    if book.user_id == request.state.user.id:
        return book
    from models import Session, Session_Participant
    
    session_query = await db.execute(
        select(Session)
        .join(Session_Participant)
        .where(
            Session.book_id == book_id,
            Session_Participant.user_id == request.state.user.id
        )
    )
    session = session_query.scalar_one_or_none()
    if session:
        return book
    
    raise HTTPException(status_code=403, detail="Access denied")

@book_router.get('/', response_model=list[schemas.BookRead])
async def get_books(
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    return await crud.read_books_by_user(request.state.user.id, db)

@book_router.patch('/{book_id}')
async def update_book(
    request: Request,
    book_id: int,
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    book_cover: Optional[UploadFile] = File(None),
    content: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_session)
):
    return await crud.update_book(request.state.user.id, book_id, title, author, book_cover, content, db)

@book_router.delete('/{book_id}')
async def delete_book(
    request: Request,
    book_id: int,
    db: AsyncSession = Depends(get_session)
):
    return await crud.delete_book(request.state.user.id, book_id, db)