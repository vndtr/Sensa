# app/models.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from typing import Optional, List
from .session_participant_model import Session_Participant

class Role(Base):
    __tablename__ = "role"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column (String(50), nullable=False, unique=True)

    participants: Mapped[List["Session_Participant"]] = relationship(
        "Session_Participant",
        back_populates="role",
        cascade="all, delete-orphan"
    )