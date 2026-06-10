# app/models.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Text, UniqueConstraint, DateTime,func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from typing import Optional, List
from datetime import datetime

class Book(Base): 
    __tablename__ = "book"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id'), nullable=False, index=True)
    title: Mapped[str] = mapped_column (String(50), nullable=False)
    author: Mapped[str] = mapped_column (String(50), nullable=False)
    content_path: Mapped[str] = mapped_column (String(50), nullable=False)
    cover_img: Mapped[str] = mapped_column (String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    
    user: Mapped["User"] = relationship("User", back_populates="books")
    solo_session: Mapped["Solo_Session"] = relationship("Solo_Session", back_populates="book", cascade="all, delete-orphan" )