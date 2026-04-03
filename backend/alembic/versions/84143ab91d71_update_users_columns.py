"""update users columns

Revision ID: 84143ab91d71
Revises: 59453803171e
Create Date: 2026-04-02 18:46:39.815396

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '84143ab91d71'
down_revision: Union[str, Sequence[str], None] = '59453803171e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('gads_dashboard', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('gads_inputs', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('gads_projects', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('gads_reports', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('gads_settings', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('seo_dashboard', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('seo_inputs', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('seo_projects', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('seo_reports', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('seo_settings', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('website_dashboard', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('website_inputs', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('website_projects', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('website_reports', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('website_settings', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'website_settings')
    op.drop_column('users', 'website_reports')
    op.drop_column('users', 'website_projects')
    op.drop_column('users', 'website_inputs')
    op.drop_column('users', 'website_dashboard')
    op.drop_column('users', 'seo_settings')
    op.drop_column('users', 'seo_reports')
    op.drop_column('users', 'seo_projects')
    op.drop_column('users', 'seo_inputs')
    op.drop_column('users', 'seo_dashboard')
    op.drop_column('users', 'gads_settings')
    op.drop_column('users', 'gads_reports')
    op.drop_column('users', 'gads_projects')
    op.drop_column('users', 'gads_inputs')
    op.drop_column('users', 'gads_dashboard')
