"""add download_count and view_count to resource

Revision ID: cf26315fa740
Revises: fd1638e05542
Create Date: 2026-05-27 17:28:09.678024

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'cf26315fa740'
down_revision = 'fd1638e05542'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('resources', schema=None) as batch_op:
        batch_op.add_column(sa.Column('download_count', sa.Integer(), nullable=False, server_default=sa.text("0")))
        batch_op.add_column(sa.Column('view_count', sa.Integer(), nullable=False, server_default=sa.text("0")))


def downgrade():
    with op.batch_alter_table('resources', schema=None) as batch_op:
        batch_op.drop_column('view_count')
        batch_op.drop_column('download_count')
