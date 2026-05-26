from pydantic import BaseModel


class RegisterPassphraseRequest(BaseModel):
    email: str
    display_name: str
    turnstile_token: str = ""


class LoginPassphraseRequest(BaseModel):
    email: str
    passphrase: str
    turnstile_token: str = ""


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict
