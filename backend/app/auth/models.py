import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Enum as SAEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Role(str, enum.Enum):
    admin = "admin"
    editor = "editor"
    viewer = "viewer"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    role: Mapped[Role] = mapped_column(SAEnum(Role, name="user_role"), nullable=False, default=Role.viewer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
