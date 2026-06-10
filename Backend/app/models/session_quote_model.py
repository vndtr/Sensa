# app/models.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Text, UniqueConstraint, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from typing import Optional, List
from datetime import datetime, timezone

class Session_Quote(Base):
    __tablename__ = "session_quote"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    selected_text:Mapped[str] = mapped_column(Text, nullable=False)
    color:Mapped[str] = mapped_column(String(50), nullable=False)
    session_id: Mapped[bool] = mapped_column (ForeignKey('session.id'), nullable=False, index=True)
    participant_id: Mapped[int] = mapped_column(ForeignKey('session_participant.id', ondelete="CASCADE"), nullable=False, index=True)
    start_index:Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    end_index:Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at:Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    session: Mapped["Session"] = relationship(
        "Session",
        back_populates="session_quotes"
    )