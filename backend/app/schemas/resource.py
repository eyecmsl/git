from pydantic import BaseModel


class CreateResourceRequest(BaseModel):
    title: str
    description: str = ""
    category: str = ""


class UpdateResourceRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
