from __future__ import annotations

from typing import Annotated, Any, Literal, TypeAlias, Union

from pydantic import BaseModel, Field, TypeAdapter
import schemas


# =========================
# Common action type
# =========================

ActionType: TypeAlias = Literal["create", "update", "delete"]


# =========================
# Note data schemas
# =========================

class NoteCreateData(BaseModel):
    action_type: Literal["create"]
    payload: schemas.SessionNoteCreate

class NoteCreateResponse(BaseModel):
    action_type: Literal["create"]
    payload: schemas.SessionNoteRead


class NoteUpdateData(BaseModel):
    action_type: Literal["update"]
    payload: schemas.SessionNoteUpdate


class NoteDeleteData(BaseModel):
    action_type: Literal["delete"]
    payload: schemas.SessionNoteDelete


NoteDataIn: TypeAlias = Annotated[
    Union[NoteCreateData, NoteUpdateData, NoteDeleteData],
    Field(discriminator="action_type"),
]
NoteDataOut: TypeAlias = Annotated[
    Union[NoteCreateResponse, NoteUpdateData, NoteDeleteData],
    Field(discriminator="action_type"),
]


# =========================
# Quote data schemas
# =========================

class QuoteCreateData(BaseModel):
    action_type: Literal["create"]
    payload: schemas.SessionQuoteCreate


class QuoteCreateResponse(BaseModel):
    action_type: Literal["create"]
    payload: schemas.SessionQuoteRead


class QuoteUpdateData(BaseModel):
    action_type: Literal["update"]
    payload: schemas.SessionQuoteUpdate


class QuoteDeleteData(BaseModel):
    action_type: Literal["delete"]
    payload: schemas.SessionQuoteDelete


QuoteDataIn: TypeAlias = Annotated[
    Union[
        QuoteCreateData,
        QuoteUpdateData,
        QuoteDeleteData
    ],
    Field(discriminator="action_type"),
]

QuoteDataOut: TypeAlias = Annotated[
    Union[
        QuoteCreateResponse,
        QuoteUpdateData,
        QuoteDeleteData
    ],
    Field(discriminator="action_type"),
]


# =========================
# Answer data schemas
# =========================

class AnswerCreateData(BaseModel):
    action_type: Literal["create"]
    payload: schemas.AnswerCreate


class AnswerCreateResponse(BaseModel):
    action_type: Literal["create"]
    payload: schemas.AnswerRead

class AnswerUpdateResponse(BaseModel):
    action_type: Literal["update"]
    payload: schemas.AnswerUpdateValidate

class AnswerUpdateData(BaseModel):
    action_type: Literal["update"]
    payload: schemas.AnswerUpdate




class AnswerDeleteData(BaseModel):
    action_type: Literal["delete"]
    payload: schemas.AnswerDelete

class AnswerDeleteResponse(BaseModel):
    action_type: Literal["delete"]
    payload: schemas.AnswerDeleteValidate


AnswerDataIn: TypeAlias = Annotated[
    Union[
        AnswerCreateData,
        AnswerUpdateData,
        AnswerDeleteData
    ],
    Field(discriminator="action_type"),
]

AnswerDataOut: TypeAlias = Annotated[
    Union[
        AnswerCreateResponse,
        AnswerUpdateResponse,
        AnswerDeleteResponse
    ],
    Field(discriminator="action_type"),
]

# =========================
# Message schemas
# =========================

class NoteMessageIn(BaseModel):
    type: Literal["note"]
    data: NoteDataIn

class NoteMessageOut(BaseModel):
    type: Literal["note"]
    data: NoteDataOut


class QuoteMessageIn(BaseModel):
    type: Literal["quote"]
    data: QuoteDataIn


class QuoteMessageOut(BaseModel):
    type: Literal["quote"]
    data: QuoteDataOut


class AnswerMessageIn(BaseModel):
    type: Literal["answer"]
    data: AnswerDataIn


class AnswerMessageOut(BaseModel):
    type: Literal["answer"]
    data: AnswerDataOut


WSMessageIn: TypeAlias = Annotated[
    Union[
        NoteMessageIn,
        QuoteMessageIn,
        AnswerMessageIn
    ],
    Field(discriminator="type"),
]

ws_message_adapter = TypeAdapter(WSMessageIn)

def validate_ws_message(raw: Any) -> WSMessageIn:
    return ws_message_adapter.validate_python(raw)


WSMessageOut: TypeAlias = Annotated[
    Union[
        NoteMessageOut,
        QuoteMessageOut,
        AnswerMessageOut
    ],
    Field(discriminator="type"),
]



EXAMPLE_MESSAGE = {
    "type": "note",
    "data": {
        "action_type": "create",
        "payload": {
            "session_id": 1,
            "participant_id": 2,
            "selected_text": "hello",
            "color": "yellow",
            "is_private": False,
            "comment": "my note",
            "start_index": 0,
            "end_index": 5
        }
    }
}