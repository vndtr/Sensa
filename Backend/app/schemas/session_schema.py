from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional


class SessionBase(BaseModel):
    name: str
    book_id: int

class SessionNotifications(BaseModel):
    limit:int
    offset:int

class SessionCreate(SessionBase):
    pass


class SessionUpdate(SessionCreate):
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

class SessionRead(SessionBase):
    id: int
    is_active: bool
    link:str
    model_config = ConfigDict(from_attributes=True)




