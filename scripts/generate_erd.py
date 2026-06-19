#!/usr/bin/env python3
"""Write the Mermaid ER diagram of the DOGS schema to docs/erd.mmd.

The diagram itself is built by app.services.erd_service so the API's
GET /erd endpoint and this CLI script stay in sync.
"""

from __future__ import annotations

import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1] / "api"
sys.path.insert(0, str(API_ROOT))

from app.database import Base  # noqa: E402
from app.services.erd_service import generate_erd_diagram  # noqa: E402


def main() -> None:
    diagram = generate_erd_diagram()
    output_path = Path(__file__).resolve().parents[1] / "docs" / "erd.mmd"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(diagram, encoding="utf-8")
    print(f"Wrote {output_path} ({len(Base.metadata.tables)} tables)")


if __name__ == "__main__":
    main()
