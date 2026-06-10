from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class BookBase(BaseModel):
    title: str
    author: str 

class BookMinio(BaseModel):
    id:int

class BookCreate(BookBase):
    user_id: int
    cover_img:str
    content_path:str
 
class BookDelete(BookBase):
    id:int

class BookUpdate(BookBase):
    id:int
    user_id: int
    cover_img:str
    content_path:str


class BookRead(BookCreate):
    id: int 
    model_config = ConfigDict(from_attributes=True)

class UploadBookResponse(BaseModel):
    file_name: str
    pages: int