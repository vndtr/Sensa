# app/crud.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import models, schemas
from sqlalchemy import select, func, cast, Float, insert, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, Depends, Form, File, UploadFile
from deps import get_session
from minio_api import upload_cover_to_minio, delete_book_from_minio, upload_book_to_minio
from typing import Optional
# book

async def create_book( 
    title:str = Form(...),
    author:str = Form(...),
    user_id:int = Form(...),
    book_cover:UploadFile = File(...),
    content:UploadFile = File(...),
    db:AsyncSession = Depends(get_session)
    ):

    user = await db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        content_path =await upload_book_to_minio(content) 
    except:
        raise HTTPException(status_code=400, detail="failed to upload book content")
    try:
        cover_img =await upload_cover_to_minio(book_cover) 
    except:
        raise HTTPException(status_code=400, detail="failed to upload book cover")
    db_book = models.Book(title=title, author=author, user_id=user_id, content_path=content_path, cover_img=cover_img)
    db.add(db_book)
    try:
        await db.commit()
        await db.refresh(db_book)        
    except:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Error: book is already created")
    return db_book

#bookview
async def read_book_by_id(
        user_id:int,
        book_id:int,db:AsyncSession = Depends(get_session)):    
    book = await db.get(models.Book, book_id)
    if (not book):
        raise HTTPException(status_code=400, detail="Error")
    if book.user_id != user_id:
        raise HTTPException(status_code=403, detail="forbidden access")
    return book

#UserPage
async def read_books_by_user(
        user_id:int,db:AsyncSession = Depends(get_session)):
    q = select(models.Book).where(models.Book.user_id == user_id)
    books = (await db.execute(q)).scalars().all()
    return books

# надо выключать при запросе file если не обновляем картинку
async def update_book( 
    user_id:int,
    book_id:int ,
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    book_cover: Optional[UploadFile] = File(None),
    content: Optional[UploadFile] = File(None),
    db:AsyncSession = Depends(get_session)
):
    q = select(models.Book).where(models.Book.id == book_id)
    book = (await (db.execute(q))).scalar_one_or_none()

    if book is None:
        raise HTTPException(status_code=404, detail="book not found")
    if book.user_id != user_id:
        raise HTTPException(status_code=403, detail="forbidden access")
    if title:
        book.title = title
    if author:
        book.author = author
    if book_cover:
        src = book.cover_img
        if src:
            await delete_book_from_minio(src)
        book.cover_img = await upload_book_to_minio(file=book_cover)
    if content:
        src = book.content_path
        if src:
            await delete_book_from_minio(src)
        book.content_path = await upload_book_to_minio(file=content)

    try:
        await db.commit()
        await db.refresh(book)
    except:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Error")
    return book


async def delete_book(
    user_id: int,
    book_id: int, 
    db: AsyncSession
):
    q = select(models.Book).where(models.Book.id == book_id)
    book = (await db.execute(q)).scalar_one_or_none()
    
    if book is None:
        raise HTTPException(status_code=404, detail="book not found")
    
    if book.user_id != user_id:
        raise HTTPException(status_code=403, detail="forbidden access")
    
    old_cover_path = book.cover_img
    old_content_path = book.content_path
    
    try:
        await db.delete(book)
        await db.commit()
    except Exception as e:
        await db.rollback()
        # Выводим полную ошибку в лог
        print("=" * 50)
        print("Ошибка при удалении книги:")
        print(str(e))
        print("=" * 50)
        raise HTTPException(status_code=400, detail=f"Error deleting book from DB: {str(e)}")

    if old_cover_path:
        try:
            await delete_book_from_minio(old_cover_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"book deleted from DB, but failed to delete file: {e}")
    if old_content_path:
        try:
            await delete_book_from_minio(old_content_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"book deleted from DB, but failed to delete file: {e}")

    return {"message": "deleted succesfully"}