from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class AnswerBase(BaseModel):
    note_id:int    

class AnswerCreate(AnswerBase):
    content: str
    session_id:int

class AnswerCreateResponse(AnswerBase):
    content: str    
 
class AnswerUpdate(AnswerBase):
    id:int
    session_id:int
    content: str
    model_config = ConfigDict(from_attributes=True)

class AnswerUpdateValidate(AnswerBase):
    id:int
    participant_id:int
    content: str
    model_config = ConfigDict(from_attributes=True)
 
class AnswerDelete(AnswerBase):
    id:int 
    session_id:int
    model_config = ConfigDict(from_attributes=True)

class AnswerDeleteValidate(AnswerBase):
    id:int 
    session_id:int
    model_config = ConfigDict(from_attributes=True)
 
class AnswerRead(AnswerCreateResponse):
    id: int 
    model_config = ConfigDict(from_attributes=True)
