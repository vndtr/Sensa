from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class ParticipantBase(BaseModel):
    session_id: int
    user_id: int 

class ParticipantCreate(ParticipantBase):
    pass
 
class ParticipantRead(ParticipantCreate):
    id: int 
    role_id:int
    model_config = ConfigDict(from_attributes=True)
