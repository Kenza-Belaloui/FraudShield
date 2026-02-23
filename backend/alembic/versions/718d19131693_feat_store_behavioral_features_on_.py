"""feat: store behavioral features on transactions

Revision ID: 718d19131693
Revises: 579cdb0085bf
Create Date: 2026-02-23 23:03:09.430246

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '718d19131693'
down_revision: Union[str, Sequence[str], None] = '579cdb0085bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "transactions",
        sa.Column("features", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "transactions",
        sa.Column("reason_codes", postgresql.ARRAY(sa.Text()), nullable=True),
    )


def downgrade():
    op.drop_column("transactions", "reason_codes")
    op.drop_column("transactions", "features")
