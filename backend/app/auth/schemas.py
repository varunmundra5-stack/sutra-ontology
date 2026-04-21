from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from .models import Role


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str | None = None
    role: Role = Role.viewer


class UserOut(BaseModel):
    id: int
    email: str  # plain str — seed admin uses .local domain which EmailStr rejects
    full_name: str | None
    role: Role
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str  # plain str — allows .local / internal domains
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
