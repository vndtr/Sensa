# app/models.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from typing import Optional, List
from .solo_note_model import Solo_Note
from .solo_quote_model import Solo_Quote

class Solo_Session(Base):
    __tablename__ = "solo_session"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey('book.id', ondelete="CASCADE"), nullable=False)
    last_position: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    user_id: Mapped[int] = mapped_column (ForeignKey('user.id'), nullable=False)
    
    solo_notes: Mapped[List["Solo_Note"]] = relationship("Solo_Note", back_populates='solo_session', cascade="all, delete-orphan")
    solo_quotes: Mapped[List["Solo_Note"]] = relationship("Solo_Quote", back_populates='solo_session', cascade="all, delete-orphan")
    user: Mapped["User"] = relationship(
        "User",
        back_populates="solo_sessions"
    )
    book: Mapped ["Book"] = relationship("Book", back_populates="solo_session")
    __table_args__ = (
        UniqueConstraint('user_id', 'book_id', name='uq_user_book'),
    )
