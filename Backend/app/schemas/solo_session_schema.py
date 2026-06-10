from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional


class SoloSessionBase(BaseModel):
    book_id: int

class SoloSessionCreate(SoloSessionBase):
    user_id: int


class SoloSessionUpdate(SoloSessionCreate):
    model_config = ConfigDict(from_attributes=True)

class SoloSessionRead(SoloSessionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)




