# app/models.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from typing import Optional, List

class Solo_Quote(Base):
    __tablename__ = "solo_quote"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    selected_text:Mapped[str] = mapped_column(Text, nullable=False)
    color:Mapped[str] = mapped_column(String(50), nullable=False)
    solo_session_id:Mapped[str] = mapped_column(ForeignKey('solo_session.id'), nullable=False)
    start_index:Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    end_index:Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    solo_session:Mapped["Solo_Session"] = relationship("Solo_Session", back_populates='solo_quotes')