from pydantic import BaseModel


class RegisterPassphraseRequest(BaseModel):
    email: str
    display_name: str


class LoginPassphraseRequest(BaseModel):
    email: str
    passphrase: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict
