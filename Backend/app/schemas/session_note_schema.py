from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class SessionNoteBase(BaseModel):
    session_id: int

class SessionNoteCreate(SessionNoteBase):
    selected_text:str
    color:str
    is_private:bool
    comment:str
    start_index:int
    end_index:int
    
class SessionNoteUpdate(SessionNoteBase):
    id:int
    selected_text:Optional[str] = None
    color:Optional[str] = None
    is_private:Optional[bool] = None
    comment:Optional[str] = None
    start_index:Optional[int] = None
    end_index:Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class SessionNoteDelete(SessionNoteBase):
    id:int
    model_config = ConfigDict(from_attributes=True)

class SessionNoteRead(SessionNoteCreate):
    id: int 
    model_config = ConfigDict(from_attributes=True)
