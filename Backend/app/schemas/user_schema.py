from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional


class UserBase(BaseModel):
    name: str
    last_name: Optional[str] = None

class UserCreate(UserBase):
    password: str 
    email: EmailStr 
    background_color:Optional[str] = None
    font_size:Optional[int] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    background_color:Optional[str] = None
    font_size:Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class UserRead(UserBase):
    id: int
    email: str
    background_color:str
    font_size:int
    model_config = ConfigDict(from_attributes=True)
