# app/models.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Text, UniqueConstraint, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from typing import Optional, List
# from .session_participant_model import Session_Participant
from datetime import datetime, timezone

class Answer(Base):
    __tablename__ = "answer"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    content: Mapped[str] = mapped_column (Text, nullable=False)
    participant_id: Mapped[int] = mapped_column(ForeignKey("session_participant.id", ondelete="CASCADE"), nullable=False)
    note_id: Mapped[int] = mapped_column (ForeignKey('session_note.id'), nullable=False, index=True)
    created_at:Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    participant: Mapped["Session_Participant"] = relationship("Session_Participant", back_populates="answers")
    note: Mapped["Session_Note"] = relationship(
        "Session_Note", back_populates="answers"
    )