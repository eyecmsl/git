from pydantic import BaseModel, EmailStr


class RegisterStartRequest(BaseModel):
    email: str
    display_name: str


class RegisterStartResponse(BaseModel):
    challenge_id: str
    public_key_options: dict


class RegisterCompleteRequest(BaseModel):
    challenge_id: str
    credential: dict


class LoginStartRequest(BaseModel):
    email: str


class LoginStartResponse(BaseModel):
    challenge_id: str
    public_key_options: dict


class LoginCompleteRequest(BaseModel):
    challenge_id: str
    credential: dict


class AuthTokens(BaseModel):
    access_token: str
    refresh_token: str
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
