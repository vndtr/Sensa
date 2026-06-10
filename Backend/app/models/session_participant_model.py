# app/models.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Text, UniqueConstraint, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from typing import Optional, List
from .answer_model import Answer
from .session_note_model import Session_Note
 
class Session_Participant(Base):
    __tablename__ = "session_participant"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] =mapped_column (ForeignKey('session.id'), nullable=False)
    user_id: Mapped[int] = mapped_column (ForeignKey('user.id'), nullable=False)
    role_id: Mapped[bool] = mapped_column (ForeignKey('role.id'), nullable=False)
    last_page: Mapped[int] = mapped_column(Integer, default=0) 
    
    session_notes: Mapped[List["Session_Note"]] = relationship ("Session_Note", back_populates='participant', cascade="all, delete-orphan")
    answers: Mapped[List["Answer"]] = relationship("Answer", back_populates="participant", cascade="all, delete-orphan") 
    user: Mapped["User"] = relationship("User", back_populates="session_participant")
    role: Mapped["Role"] = relationship("Role", back_populates="participants")
    session: Mapped["Session"] = relationship("Session", back_populates="participants")