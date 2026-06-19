from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from app.services.erd_service import generate_erd_diagram

router = APIRouter(tags=["erd"])


@router.get("/erd", response_class=PlainTextResponse)
def get_erd():
    """Mermaid ER diagram (erDiagram) of the live schema — paste into mermaid.live to render."""
    return generate_erd_diagram()
