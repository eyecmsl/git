from pydantic import BaseModel


class CreateResourceRequest(BaseModel):
    title: str
    description: str = ""


class UpdateResourceRequest(BaseModel):
    title: str | None = None
    description: str | None = None
