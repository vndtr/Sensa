from fastapi import APIRouter, Depends, Request, Query
from fastapi.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import crud
import schemas
from deps import get_session

session_quote_router = APIRouter(prefix="/session/quote", tags=["session_quote"])

@session_quote_router.post('/create')
async def add_session_quote(
    session_quote: schemas.SessionQuoteCreate,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    return await crud.create_session_quote(request.state.user.id, session_quote, db)

@session_quote_router.post('/update')
async def update_session_quote(
    session_quote: schemas.SessionQuoteUpdate,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    return await crud.update_session_quote(request.state.user.id, session_quote, db)

@session_quote_router.post('/delete')
async def delete_session_quote(
    session_quote: schemas.SessionQuoteDelete,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    return await crud.delete_session_quote(request.state.user.id, session_quote, db)

@session_quote_router.get('/')
async def get_session_quotes(
    request: Request,
    session_id: int = Query(...),
    db: AsyncSession = Depends(get_session)
):
    if session_id is None:
        raise HTTPException(status_code=422, detail="session_id must be provided")
    
    quotes = await crud.get_session_quotes_by_session_user_id(session_id, request.state.user.id, db)
    
    result = []
    for quote in quotes:
        result.append({
            "id": quote.id,
            "selected_text": quote.selected_text,
            "color": quote.color,
            "start_index": quote.start_index,
            "end_index": quote.end_index,
            "created_at": str(quote.created_at) if hasattr(quote, 'created_at') else None
        })
    
    return result