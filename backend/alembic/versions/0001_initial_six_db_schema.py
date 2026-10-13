"""Initial Six-Database Schema for DCE Bus Tracking & Face Attendance

Revision ID: 0001_initial_six_db
Revises: None
Create Date: 2026-10-13 11:18:00
"""
from typing import Sequence, Union
from alembic import op
from backend.app.database import MODULE_ENGINES

revision: str = "0001_initial_six_db"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    for _, (base_cls, mod_engine, _) in MODULE_ENGINES.items():
        if str(bind.engine.url) == str(mod_engine.url):
            base_cls.metadata.create_all(bind=bind)


def downgrade() -> None:
    pass
