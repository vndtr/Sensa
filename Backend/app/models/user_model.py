# app/models.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from typing import Optional, List
from .book_model import Book
from .session_participant_model import Session_Participant
from .solo_session_model import Solo_Session
from .session_note_model import Session_Note
class User(Base):
    __tablename__ = "user"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column (String(50), nullable=False)
    last_name: Mapped[str] = mapped_column (String(50), nullable=False)
    password: Mapped[str] = mapped_column (String(250), nullable=False)
    email: Mapped[str] = mapped_column (String(50), nullable=False)
    background_color: Mapped[str]= mapped_column (String(50), default="white")
    font_size: Mapped[int]= mapped_column (Integer, default=14)

    books: Mapped[List["Book"]] = relationship ("Book", back_populates="user", cascade="all, delete-orphan")
    solo_sessions: Mapped[List["Solo_Session"]] = relationship ("Solo_Session", back_populates="user", cascade="all, delete-orphan")
    session_participant: Mapped[List["Session_Participant"]] = relationship("Session_Participant", back_populates='user', cascade="all, delete-orphan")
    
    
    
    
