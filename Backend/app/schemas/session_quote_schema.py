from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class SessionQuoteBase(BaseModel):
    session_id: int

class SessionQuoteCreate(SessionQuoteBase):
    selected_text:str
    color:str
    start_index:int
    end_index:int

class SessionQuoteUpdate(SessionQuoteBase):
    id:int
    selected_text:Optional[str] = None
    color:Optional[str] = None
    start_index:Optional[int] = None
    end_index:Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class SessionQuoteDelete(SessionQuoteBase):
    id:int
    model_config = ConfigDict(from_attributes=True)
 
class SessionQuoteRead(SessionQuoteCreate):
    id: int 
    model_config = ConfigDict(from_attributes=True)
 